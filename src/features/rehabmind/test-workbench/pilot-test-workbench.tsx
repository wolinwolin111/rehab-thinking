"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import RehabMindCompleteDemo from "@/src/features/rehabmind/components/workbench/rehabmind-workbench";
import type {
  PilotDraftEnvelope,
  PersistedDemoSnapshotV3,
  SavedDemoRecord,
  SavedDemoSnapshot,
} from "@/src/features/rehabmind/components/workbench/workbench-support";
import { getGoalLabel, normalizeSavedDemoSnapshot, persistSavedDemoSnapshot, STEPS } from "@/src/features/rehabmind/components/workbench/workbench-support";
import { createLocalCaseId } from "@/src/infrastructure/pilot/persistence/local-case-identity";
import {
  clearLocalDraft,
  loadLocalCaseRecords,
  loadLocalDraft,
  saveLocalCaseRecords,
  saveLocalDraft,
} from "@/src/infrastructure/pilot/persistence/local-case-store";
import { PILOT_RELEASE_VERSIONS } from "@/src/infrastructure/pilot/release/release-version";
import { buildPilotConsentRecord } from "@/src/infrastructure/pilot/consent/consent-core";
import {
  createPilotAccessToken,
  createPilotCase,
  createPilotClientCreationId,
  savePilotCaseProgress,
  type PilotTestContext,
} from "@/src/infrastructure/pilot/api/case-client";
import {
  createPilotScenarioSnapshot,
  findPilotTestScenario,
  PILOT_TEST_SCENARIOS,
  type PilotScenarioSeedContext,
  type PilotTestMode,
  type PilotTestScenario,
} from "./scenario-catalog";
import "@/src/features/rehabmind/styles/test-workbench.css";

const RUN_STORAGE_KEY = "rehabmind-test-run-v1";

type AccessState = "checking" | "allowed" | "denied" | "error";
type PersistedTestRecordV3 = Omit<SavedDemoRecord, "snapshot" | "pilotConflictSnapshot"> & {
  snapshot?: PersistedDemoSnapshotV3;
  pilotConflictSnapshot?: PersistedDemoSnapshotV3;
};
type PersistedTestDraftV3 = Omit<PilotDraftEnvelope, "snapshot"> & { snapshot: PersistedDemoSnapshotV3 };

function normalizeTestRecord(record: PersistedTestRecordV3): SavedDemoRecord | null {
  const snapshot = record.snapshot ? normalizeSavedDemoSnapshot(record.snapshot) : null;
  if (record.snapshot && !snapshot) return null;
  const conflict = record.pilotConflictSnapshot ? normalizeSavedDemoSnapshot(record.pilotConflictSnapshot) : null;
  return { ...record, snapshot: snapshot ?? undefined, pilotConflictSnapshot: conflict ?? undefined };
}

function persistTestRecord(record: SavedDemoRecord): PersistedTestRecordV3 {
  const { snapshot, pilotConflictSnapshot, ...metadata } = record;
  return {
    ...metadata,
    snapshot: snapshot ? persistSavedDemoSnapshot(snapshot) : undefined,
    pilotConflictSnapshot: pilotConflictSnapshot ? persistSavedDemoSnapshot(pilotConflictSnapshot) : undefined,
  };
}

const REPRODUCTION_FREE_TEXT_KEYS = new Set(["professionalNotes", "text", "note", "detail", "customAction"]);

function redactReproductionValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactReproductionValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key,
    REPRODUCTION_FREE_TEXT_KEYS.has(key) && typeof item === "string" && item.trim() ? "[复现包已脱敏]" : redactReproductionValue(item),
  ]));
}

function newRunId() {
  const suffix = globalThis.crypto?.randomUUID?.().replaceAll("-", "").slice(0, 12)
    ?? `${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
  return `run_${suffix}`;
}

function currentRunId() {
  try {
    const stored = window.sessionStorage.getItem(RUN_STORAGE_KEY);
    if (stored && /^[A-Za-z0-9_-]{8,128}$/.test(stored)) return stored;
    const created = newRunId();
    window.sessionStorage.setItem(RUN_STORAGE_KEY, created);
    return created;
  } catch {
    return newRunId();
  }
}

function appUrl(path: string) {
  const prefix = window.location.pathname.startsWith("/RehabMind/") ? "/RehabMind" : "";
  return `${prefix}${path}`;
}

function rebindSnapshotToTestCase(snapshot: SavedDemoSnapshot, localCaseId: string, savedAt: string, seed: PilotScenarioSeedContext): SavedDemoSnapshot {
  return {
    ...snapshot,
    localCaseId,
    problemThreadId: snapshot.problemThreadId ?? seed.problemThreadId,
    sessionId: snapshot.sessionId ?? seed.sessionId,
    sessionStartedAt: savedAt,
    draftSavedAt: savedAt,
    problemThreads: snapshot.problemThreads?.map((thread) => ({ ...thread, caseId: localCaseId })),
    sessionIndex: snapshot.sessionIndex?.map((session) => ({ ...session, caseId: localCaseId })),
  };
}

async function seedScenario(scenario: PilotTestScenario, testRunId: string, snapshotOverride?: PilotDraftEnvelope["snapshot"]) {
  const localCaseId = createLocalCaseId();
  const savedAt = new Date(Date.now() - (scenario.restoreAgeMs ?? 0)).toISOString();
  const clientCreationId = createPilotClientCreationId();
  const seed: PilotScenarioSeedContext = {
    localCaseId,
    problemThreadId: `thread-test-${localCaseId}`,
    sessionId: `session-test-${localCaseId}`,
    historicalProblemThreadId: `thread-history-${localCaseId}`,
    historicalSessionId: `session-history-${localCaseId}`,
    savedAt,
  };
  const context: PilotTestContext = {
    testRunId,
    scenarioId: scenario.id,
    createdBy: "test_workbench",
    ...(scenario.faultMode ? { faultMode: scenario.faultMode } : {}),
  };
  const snapshot = snapshotOverride
    ? rebindSnapshotToTestCase(snapshotOverride, localCaseId, savedAt, seed)
    : createPilotScenarioSnapshot(scenario, seed);
  const consent = buildPilotConsentRecord(new Date().toISOString());
  let access = await createPilotCase({
    clientCreationId,
    accessToken: createPilotAccessToken(),
    initialSnapshot: persistSavedDemoSnapshot(snapshot),
    currentStage: STEPS[snapshot.step] ?? scenario.target,
    isBilateral: snapshot.intake.side === "双侧/中间",
    hasSafetyStop: Object.values(snapshot.safety).some((value) => value === "yes"),
    source: { channel: "internal_test", detail: null },
    consent,
    testContext: context,
  });
  // 历史场景不能只在 IndexedDB 中声称“第 2 次康复”。通过正式进度事件把
  // 同一份 v3 会话投影写入测试案例，使反馈的 sessionNumber 服务端归属校验
  // 与页面正在展示的 sessionIndex 保持一致；正式建案入口不经过这段接缝。
  if (snapshot.sessionNumber > 1) {
    const projection = await savePilotCaseProgress({
      access,
      requestId: `request:test-bootstrap:${clientCreationId}`,
      sessionId: snapshot.sessionId ?? seed.sessionId,
      problemThreadId: snapshot.problemThreadId ?? seed.problemThreadId,
      snapshot: persistSavedDemoSnapshot({ ...snapshot, consent }),
      eventId: `event:test-bootstrap:${clientCreationId}`,
      eventType: "session_draft_saved",
      eventPayload: {
        parsed: { localCaseId, scenarioId: scenario.id },
        inferred: { sessionNumber: snapshot.sessionNumber, sessionStatus: snapshot.sessionStatus ?? "draft" },
        clinical: {
          problemThreads: snapshot.problemThreads ?? [],
          sessionIndex: snapshot.sessionIndex ?? [],
        },
      },
      currentStage: STEPS[snapshot.step] ?? scenario.target,
      isBilateral: snapshot.intake.side === "双侧/中间",
      hasSafetyStop: Object.values(snapshot.safety).some((value) => value === "yes"),
      sessionCount: snapshot.sessionNumber,
    });
    access = { ...access, revision: projection.snapshot.revision };
  }
  const existing = await loadLocalCaseRecords<PersistedTestRecordV3>("test");
  const record: SavedDemoRecord = {
    id: `test-${localCaseId}`,
    localCaseId,
    savedAt,
    region: snapshot.intake.regionId || "待确认",
    complaint: snapshot.intake.description.trim() || scenario.initialProblem,
    goal: getGoalLabel(snapshot.intake.goal),
    initialScore: snapshot.intake.baselineScore,
    latestScore: snapshot.followupScoreHistory.at(-1) ?? snapshot.intake.baselineScore,
    scoreComparable: Boolean(snapshot.intake.baselineScoreConfirmed),
    sessionCount: snapshot.sessionNumber,
    problemThreadId: snapshot.problemThreadId,
    sessionId: snapshot.sessionId,
    sessionStatus: snapshot.sessionStatus ?? "draft",
    sessionHistory: snapshot.sessionHistory,
    problemThreads: snapshot.problemThreads,
    sessionIndex: snapshot.sessionIndex,
    status: "康复中",
    snapshot,
    pilotCaseId: access.caseId,
    pilotClientCreationId: clientCreationId,
    pilotPublicCode: access.publicCode,
    pilotAccessToken: access.accessToken,
    pilotRevision: access.revision,
    pilotLastSyncedRevision: access.revision,
    pilotDirty: false,
    pilotSnapshotUpdatedAt: savedAt,
    pilotVersions: access.versions,
    testRunId,
    scenarioId: scenario.id,
  };
  const persistedRecord = persistTestRecord(record);
  await saveLocalCaseRecords([persistedRecord, ...existing.records.filter((item) => item.localCaseId !== localCaseId)], "test");
  const draft: PersistedTestDraftV3 = {
    schemaVersion: 3,
    localCaseId,
    savedAt,
    snapshot: persistSavedDemoSnapshot(snapshot),
  };
  await saveLocalDraft(draft, "test");
  return { draft: { ...draft, snapshot }, record, context };
}

export default function PilotTestWorkbench() {
  const [access, setAccess] = useState<AccessState>("checking");
  const [mode, setMode] = useState<PilotTestMode>("full_flow");
  const [selectedId, setSelectedId] = useState(PILOT_TEST_SCENARIOS[0].id);
  const [active, setActive] = useState<{ context: PilotTestContext; scenario: PilotTestScenario; localCaseId: string; instance: number } | null>(null);
  const [latestRecord, setLatestRecord] = useState<SavedDemoRecord | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [runId, setRunId] = useState("");

  const scenarios = useMemo(() => PILOT_TEST_SCENARIOS.filter((item) => item.mode === mode), [mode]);

  const checkAccess = useCallback(async () => {
    setAccess("checking");
    try {
      const response = await fetch("/api/pilot/test/access", { credentials: "include" });
      if (response.ok) setAccess("allowed");
      else setAccess(response.status === 401 ? "denied" : "error");
    } catch {
      setAccess("error");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setRunId(currentRunId());
      void checkAccess();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [checkAccess]);

  const refreshLatestRecord = useCallback(async () => {
    if (!active) return null;
    const result = await loadLocalCaseRecords<PersistedTestRecordV3>("test");
    const rawMatching = result.records.find((record) => record.localCaseId === active.localCaseId);
    const matching = rawMatching ? normalizeTestRecord(rawMatching) : null;
    setLatestRecord(matching);
    return matching;
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const initial = window.setTimeout(() => void refreshLatestRecord(), 0);
    const timer = window.setInterval(() => void refreshLatestRecord(), 1500);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [active, refreshLatestRecord]);

  async function launch(scenario: PilotTestScenario, snapshotOverride?: PilotDraftEnvelope["snapshot"]) {
    setBusy(true);
    setMessage("");
    try {
      const testRunId = runId || currentRunId();
      if (!runId) setRunId(testRunId);
      const seeded = await seedScenario(scenario, testRunId, snapshotOverride);
      setLatestRecord(seeded.record);
      setActive((current) => ({
        context: seeded.context,
        scenario,
        localCaseId: seeded.draft.localCaseId,
        instance: (current?.instance ?? 0) + 1,
      }));
    } catch {
      setMessage("测试起点写入失败，请检查浏览器本机存储权限。");
    } finally {
      setBusy(false);
    }
  }

  async function startSelected() {
    const scenario = findPilotTestScenario(selectedId);
    if (scenario) await launch(scenario);
  }

  async function restartScenario() {
    if (!active) return;
    await clearLocalDraft("test");
    await launch(active.scenario);
  }

  async function cloneScenario() {
    if (!active) return;
    const draft = await loadLocalDraft<PersistedTestDraftV3>("test");
    await launch(active.scenario, draft ? normalizeSavedDemoSnapshot(draft.snapshot) ?? undefined : undefined);
  }

  async function clearDraft() {
    await clearLocalDraft("test");
    setMessage("当前设备的测试草稿已清除，已保存的测试案例不受影响。");
  }

  async function copyCaseCode() {
    const record = await refreshLatestRecord();
    const code = record?.pilotPublicCode;
    if (!code) {
      setMessage("尚未生成测试案例编号。请先在流程中保存一次。");
      return;
    }
    await navigator.clipboard.writeText(code);
    setMessage(`已复制测试案例编号 ${code}`);
  }

  async function exportReproductionPackage() {
    const record = await refreshLatestRecord();
    if (!record?.snapshot) {
      setMessage("当前还没有可导出的测试快照，请先在流程中保存一次。");
      return;
    }
    const reproductionSnapshot = redactReproductionValue(persistSavedDemoSnapshot(record.snapshot)) as PersistedDemoSnapshotV3;
    const payload = {
      packageSchemaVersion: 1,
      exportedAt: new Date().toISOString(),
      testRun: active?.context ?? null,
      scenario: active?.scenario ? {
        id: active.scenario.id,
        title: active.scenario.title,
        mode: active.scenario.mode,
        target: active.scenario.target,
      } : null,
      releaseVersions: PILOT_RELEASE_VERSIONS,
      record: {
        localCaseId: record.localCaseId,
        pilotCaseId: record.pilotCaseId,
        pilotPublicCode: record.pilotPublicCode,
        status: record.status,
        sessionCount: record.sessionCount,
        savedAt: record.savedAt,
      },
      snapshot: reproductionSnapshot,
      note: "内部测试复现包：不包含用户正式数据，不作为测试结论本身。",
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${active?.context.testRunId ?? "rehabmind-test"}-${active?.scenario.id ?? "snapshot"}-reproduction.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage("复现包已导出，可连同测试编号交给开发定位。");
  }

  function openAdminRecord() {
    const query = latestRecord?.pilotPublicCode ? `?publicCode=${encodeURIComponent(latestRecord.pilotPublicCode)}` : "";
    window.open(appUrl(`/admin${query}`), "_blank", "noopener,noreferrer");
  }

  async function deleteRun() {
    if (!active || !window.confirm(`删除运行批次 ${active.context.testRunId} 产生的全部服务器测试案例？`)) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/pilot/test/runs/${encodeURIComponent(active.context.testRunId)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("delete failed");
      const body = await response.json() as { deleted?: number };
      await clearLocalDraft("test");
      const local = await loadLocalCaseRecords<PersistedTestRecordV3>("test");
      await saveLocalCaseRecords(local.records.filter((record) => record.testRunId !== active.context.testRunId), "test");
      const nextRunId = newRunId();
      window.sessionStorage.setItem(RUN_STORAGE_KEY, nextRunId);
      setRunId(nextRunId);
      setActive(null);
      setLatestRecord(null);
      setMessage(`已删除 ${body.deleted ?? 0} 个服务器测试案例，并清理本机测试数据。`);
    } catch {
      setMessage("批量删除失败，服务器测试数据没有被静默忽略。");
    } finally {
      setBusy(false);
    }
  }

  if (access === "checking") {
    return <main className="rm-test-access"><strong>正在确认测试工作台权限</strong><span>请稍候</span></main>;
  }

  if (access !== "allowed") {
    return <main className="rm-test-access"><strong>{access === "denied" ? "需要管理员权限" : "暂时无法确认权限"}</strong><span>本地开发可直接进入；VPS 环境需先登录管理后台。</span><div><a href={typeof window === "undefined" ? "/admin" : appUrl("/admin")}>打开管理后台</a><button type="button" onClick={() => void checkAccess()}>重新检查</button></div></main>;
  }

  if (!active) {
    return <main className="rm-test-launcher" data-testid="test-workbench-launcher" data-test-run-id={runId}>
      <header>
        <div><span>内部测试</span><h1>RehabMind 测试工作台</h1><p>测试数据与用户数据隔离，不计入正式统计。</p></div>
        <a href={appUrl("/admin")}>返回管理后台</a>
      </header>

      <section className="rm-test-mode" aria-label="测试模式">
        <button type="button" className={mode === "full_flow" ? "is-active" : ""} onClick={() => { setMode("full_flow"); setSelectedId(PILOT_TEST_SCENARIOS.find((item) => item.mode === "full_flow")?.id ?? ""); }}><strong>完整流程</strong><span>只预填问题描述，后续全部按真实页面完成</span></button>
        <button type="button" className={mode === "page_boundary" ? "is-active" : ""} onClick={() => { setMode("page_boundary"); setSelectedId(PILOT_TEST_SCENARIOS.find((item) => item.mode === "page_boundary")?.id ?? ""); }}><strong>页面定向</strong><span>载入指定阶段，只作为页面边界检查</span></button>
        <button type="button" onClick={() => { window.location.href = appUrl("/decision-lab"); }}><strong>决策实验室</strong><span>直接查看生产决策函数输出，不创建案例</span></button>
      </section>

      <section className="rm-test-scenarios">
        <div className="rm-test-section-heading"><div><h2>选择起点</h2><p>{mode === "full_flow" ? "这些场景可以形成纵向流程证据。" : "这些场景带有预置状态，不能算作完整流程证据。"}</p></div><span>运行批次 {runId}</span></div>
        <div className="rm-test-scenario-list">
          {scenarios.map((scenario) => <button type="button" key={scenario.id} data-testid={`test-scenario-${scenario.id}`} data-scenario-id={scenario.id} className={selectedId === scenario.id ? "is-selected" : ""} onClick={() => setSelectedId(scenario.id)}>
            <span>{scenario.target}</span><strong>{scenario.title}</strong><small>{scenario.description}</small>
            {scenario.fixtureNote ? <em>{scenario.fixtureNote}</em> : null}
          </button>)}
        </div>
      </section>

      {message ? <p className="rm-test-message" role="status">{message}</p> : null}
      <footer><button type="button" disabled={!selectedId || busy} onClick={() => void startSelected()}>{busy ? "正在准备" : "开始测试"}</button></footer>
    </main>;
  }

  return <main className="rm-test-runtime" data-testid="test-workbench-runtime" data-scenario-id={active.scenario.id} data-test-run-id={active.context.testRunId} data-test-fault-mode={active.context.faultMode ?? "none"}>
    <header className="rm-test-toolbar">
      <div className="rm-test-toolbar-context"><span>{active.scenario.mode === "full_flow" ? "完整流程" : "页面边界测试"}</span><strong>{active.scenario.title}</strong><small>批次 {active.context.testRunId}</small></div>
      <div className="rm-test-toolbar-actions">
        <button type="button" data-testid="test-restart-scenario" disabled={busy} onClick={() => void restartScenario()}>重新开始</button>
        <button type="button" data-testid="test-clone-scenario" disabled={busy} onClick={() => void cloneScenario()}>复制为新案例</button>
        <button type="button" onClick={() => void clearDraft()}>清除草稿</button>
        <button type="button" data-testid="test-copy-case-code" onClick={() => void copyCaseCode()}>复制案例编号</button>
        <button type="button" onClick={() => void exportReproductionPackage()}>导出复现包</button>
        <button type="button" data-testid="test-open-admin" onClick={openAdminRecord}>后台记录</button>
        <button type="button" data-testid="test-delete-run" className="is-danger" disabled={busy} onClick={() => void deleteRun()}>删除本批次</button>
        <button type="button" onClick={() => setActive(null)}>切换场景</button>
      </div>
      <div className="rm-test-version" title="当前发布版本">
        <span>App {PILOT_RELEASE_VERSIONS.appVersion}</span>
        <span>知识 {PILOT_RELEASE_VERSIONS.knowledgeVersion}</span>
        <span>决策 {PILOT_RELEASE_VERSIONS.decisionVersion}</span>
      </div>
      {message ? <p role="status">{message}</p> : null}
      {active.scenario.fixtureNote ? <p className="rm-test-fixture-note" data-testid="test-fixture-note">{active.scenario.fixtureNote}</p> : null}
    </header>
    <div className="rm-test-product">
      <RehabMindCompleteDemo key={active.instance} testContext={active.context} />
    </div>
  </main>;
}
