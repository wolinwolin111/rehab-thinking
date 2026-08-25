"use client";

import { useCallback, useEffect, useState } from "react";
import "@/src/features/rehabmind/styles/admin.css";

type CaseSummary = {
  caseRecord: {
    id: string;
    publicCode: string;
    status: "active" | "deleted";
    currentStage: string | null;
    sessionCount: number;
    appVersion: string;
    knowledgeVersion: string;
    decisionVersion: string;
    sourceChannel: string | null;
    sourceDetail: string | null;
    isTestCase: boolean;
    testRunId: string | null;
    scenarioId: string | null;
    createdBy: string | null;
    createdAt: string;
    updatedAt: string;
  };
  feedbackCount: number;
  openFeedbackCount: number;
  invariantCodes: string[];
};

type CaseDetail = {
  caseRecord: CaseSummary["caseRecord"];
  snapshot: { revision: number; payload: Record<string, unknown> };
  events: Array<{ id: string; sequence: number; type: string; source: string; occurredAt: string; payload: Record<string, unknown> }>;
  feedback: Array<{ id: string; sessionNumber: number | null; stage: string; kind: string; message: string | null; sourceStage: string | null; status: string; createdAt: string }>;
  adminNotes: Array<{ id: string; note: string; createdAt: string }>;
  adminAudit: Array<{ id: string; action: string; targetId: string | null; occurredAt: string }>;
};

type TrialMetrics = {
  casesCreated: number;
  sourceChannels: Record<string, number>;
  firstSession: { completed: number; completionRate: number };
  persistence: { saved: number; recovered: number; failed: number; conflicts: number };
  followup: { created: number; rate: number };
  feedback: { submitted: number; submissionRate: number; reproduced: number };
  invariants: { totalCases: number; codes: Record<string, number> };
};

const STATUS_LABELS: Record<string, string> = {
  open: "待处理",
  in_review: "已确认",
  resolved: "已修复",
  dismissed: "无法复现",
};

const SOURCE_LABELS: Record<string, string> = {
  douyin_fan_group: "抖音粉丝群",
  douyin_comment: "抖音评论区",
  xiaohongshu: "小红书",
  friend: "朋友推荐",
  studio: "悦舒工作室",
  other: "其他",
  internal_test: "内部测试",
  unknown: "历史未记录",
};

async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers: { ...(init?.body ? { "content-type": "application/json" } : {}), ...(init?.headers ?? {}) },
  });
  const body = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(response.status === 401 ? "管理员会话已失效" : body.error || "操作失败");
  return body as T;
}

export default function PilotAdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [adminKey, setAdminKey] = useState("");
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [metrics, setMetrics] = useState<TrialMetrics | null>(null);
  const [detail, setDetail] = useState<CaseDetail | null>(null);
  const [publicCode, setPublicCode] = useState(() => typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("publicCode")?.toUpperCase() ?? "");
  const [status, setStatus] = useState("");
  const [caseKind, setCaseKind] = useState<"" | "false" | "true">("");
  const [feedbackStatus, setFeedbackStatus] = useState("");
  const [sessionNumber, setSessionNumber] = useState("");
  const [appVersion, setAppVersion] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const loadWorkspace = useCallback(async () => {
    setBusy(true);
    setMessage("");
    try {
      const search = new URLSearchParams();
      if (publicCode.trim()) search.set("publicCode", publicCode.trim());
      if (status) search.set("status", status);
      if (caseKind) search.set("isTestCase", caseKind);
      if (feedbackStatus) search.set("feedbackStatus", feedbackStatus);
      if (sessionNumber) search.set("sessionNumber", sessionNumber);
      if (appVersion.trim()) search.set("appVersion", appVersion.trim());
      const [caseResult, metricResult] = await Promise.all([
        apiJson<{ cases: CaseSummary[] }>(`/api/pilot/admin/cases?${search}`),
        apiJson<{ metrics: TrialMetrics }>("/api/pilot/admin/metrics"),
      ]);
      setCases(caseResult.cases);
      setMetrics(metricResult.metrics);
      setAuthenticated(true);
    } catch (error) {
      setAuthenticated(false);
      setMessage(error instanceof Error ? error.message : "无法读取管理数据");
    } finally {
      setBusy(false);
    }
  }, [appVersion, caseKind, feedbackStatus, publicCode, sessionNumber, status]);

  useEffect(() => {
    let active = true;
    const initialSearch = new URLSearchParams();
    if (publicCode.trim()) initialSearch.set("publicCode", publicCode.trim());
    Promise.all([
      apiJson<{ cases: CaseSummary[] }>(`/api/pilot/admin/cases?${initialSearch}`),
      apiJson<{ metrics: TrialMetrics }>("/api/pilot/admin/metrics"),
    ]).then(([caseResult, metricResult]) => {
      if (!active) return;
      setCases(caseResult.cases);
      setMetrics(metricResult.metrics);
      setAuthenticated(true);
    }).catch(() => {
      if (active) setAuthenticated(false);
    });
    return () => { active = false; };
  // The initial URL filter is captured once so links from the test workbench open the intended case.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await apiJson("/api/pilot/admin/session", { method: "POST", body: JSON.stringify({ adminKey }) });
      setAdminKey("");
      await loadWorkspace();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "登录失败");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await apiJson("/api/pilot/admin/session", { method: "DELETE" }).catch(() => null);
    setAuthenticated(false);
    setCases([]);
    setMetrics(null);
    setDetail(null);
  }

  async function openCase(caseId: string) {
    if (!window.confirm("即将查看该案例的完整健康记录，并用于问题定位。继续吗？")) return;
    setBusy(true);
    try {
      const result = await apiJson<{ case: CaseDetail }>(`/api/pilot/admin/cases/${encodeURIComponent(caseId)}`);
      setDetail(result.case);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "无法读取案例");
    } finally {
      setBusy(false);
    }
  }

  async function updateFeedback(feedbackId: string, nextStatus: string) {
    if (!detail) return;
    await apiJson(`/api/pilot/admin/cases/${encodeURIComponent(detail.caseRecord.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "update-feedback", feedbackId, status: nextStatus }),
    });
    await openCaseWithoutConfirm(detail.caseRecord.id);
  }

  async function openCaseWithoutConfirm(caseId: string) {
    const result = await apiJson<{ case: CaseDetail }>(`/api/pilot/admin/cases/${encodeURIComponent(caseId)}`);
    setDetail(result.case);
    await loadWorkspace();
  }

  async function addNote() {
    if (!detail || !note.trim()) return;
    await apiJson(`/api/pilot/admin/cases/${encodeURIComponent(detail.caseRecord.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "add-note", note }),
    });
    setNote("");
    await openCaseWithoutConfirm(detail.caseRecord.id);
  }

  async function exportCase() {
    if (!detail) return;
    const result = await apiJson<{ export: unknown }>(`/api/pilot/admin/cases/${encodeURIComponent(detail.caseRecord.id)}?format=redacted`);
    const blob = new Blob([JSON.stringify(result.export, null, 2)], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `${detail.caseRecord.publicCode}-redacted.json`;
    link.click();
    URL.revokeObjectURL(href);
  }

  async function deleteCase() {
    if (!detail || !window.confirm(`删除案例 ${detail.caseRecord.publicCode}？用户原访问凭据将立即失效。`)) return;
    await apiJson(`/api/pilot/admin/cases/${encodeURIComponent(detail.caseRecord.id)}`, { method: "DELETE" });
    setDetail(null);
    await loadWorkspace();
  }

  if (!authenticated) {
    return <main className="admin-login-shell">
      <form className="admin-login" onSubmit={login}>
        <div className="admin-brand"><b>RM</b><div><strong>RehabMind</strong><span>试用管理</span></div></div>
        <label htmlFor="admin-key">管理员密钥</label>
        <input id="admin-key" type="password" autoComplete="current-password" value={adminKey} onChange={(event) => setAdminKey(event.target.value)} />
        <button type="submit" disabled={busy || !adminKey.trim()}>{busy ? "验证中" : "进入管理台"}</button>
        {message ? <p role="alert">{message}</p> : null}
      </form>
    </main>;
  }

  return <main className="admin-shell">
    <header className="admin-topbar">
      <div className="admin-brand"><b>RM</b><div><strong>RehabMind</strong><span>试用管理</span></div></div>
      <div><a className="admin-test-link" href={typeof window === "undefined" ? "/test" : `${window.location.pathname.startsWith("/RehabMind/") ? "/RehabMind" : ""}/test`}>测试工作台</a><span>{busy ? "正在更新" : "数据已同步"}</span><button type="button" onClick={logout}>退出</button></div>
    </header>

    {metrics ? <section className="admin-metrics" aria-label="试用概览">
      <div><span>案例来源</span><strong>{metrics.casesCreated}</strong><small>{Object.entries(metrics.sourceChannels).map(([source, count]) => `${SOURCE_LABELS[source] ?? source} ${count}`).join(" · ") || "暂无案例"}</small></div>
      <div><span>首次完成</span><strong>{metrics.firstSession.completed}</strong><small>{Math.round(metrics.firstSession.completionRate * 100)}%</small></div>
      <div><span>保存 / 恢复</span><strong>{metrics.persistence.saved} / {metrics.persistence.recovered}</strong><small>冲突 {metrics.persistence.conflicts} · 失败 {metrics.persistence.failed}</small></div>
      <div><span>问题反馈</span><strong>{metrics.feedback.submitted}</strong><small>已确认或修复 {metrics.feedback.reproduced}</small></div>
      <div className={metrics.invariants.totalCases ? "is-warning" : ""}><span>流程异常</span><strong>{metrics.invariants.totalCases}</strong><small>按固定技术码定位</small></div>
    </section> : null}

    <section className="admin-toolbar" aria-label="案例筛选">
      <label>案例编号<input value={publicCode} onChange={(event) => setPublicCode(event.target.value.toUpperCase())} /></label>
      <label>案例状态<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">全部</option><option value="active">使用中</option><option value="deleted">已删除</option></select></label>
      <label>数据类型<select value={caseKind} onChange={(event) => setCaseKind(event.target.value as "" | "false" | "true")}><option value="">全部</option><option value="false">用户案例</option><option value="true">测试案例</option></select></label>
      <label>反馈状态<select value={feedbackStatus} onChange={(event) => setFeedbackStatus(event.target.value)}><option value="">全部</option>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>至少康复次数<input type="number" min="1" value={sessionNumber} onChange={(event) => setSessionNumber(event.target.value)} /></label>
      <label>应用版本<input value={appVersion} onChange={(event) => setAppVersion(event.target.value)} /></label>
      <button type="button" onClick={() => void loadWorkspace()} disabled={busy}>查询</button>
    </section>

    {message ? <p className="admin-message" role="alert">{message}</p> : null}

    <div className="admin-workspace">
      <section className="admin-case-list" aria-label="案例列表">
        <header><h1>案例</h1><span>{cases.length} 条当前结果</span></header>
        {cases.map((item) => <button type="button" key={item.caseRecord.id} className={detail?.caseRecord.id === item.caseRecord.id ? "is-selected" : ""} onClick={() => void openCase(item.caseRecord.id)}>
          <div><strong>{item.caseRecord.publicCode}</strong>{item.caseRecord.isTestCase ? <span className="is-test">测试</span> : null}<span>{item.caseRecord.status === "active" ? "使用中" : "已删除"}</span></div>
          <p>{item.caseRecord.currentStage ?? "未记录阶段"} · 第 {item.caseRecord.sessionCount} 次</p>
          <small>{new Date(item.caseRecord.updatedAt).toLocaleString("zh-CN")} · 反馈 {item.feedbackCount}</small>
          {item.invariantCodes.length ? <em>{item.invariantCodes.join(" · ")}</em> : null}
        </button>)}
        {!cases.length ? <p className="admin-empty">没有符合条件的案例</p> : null}
      </section>

      <section className="admin-detail" aria-label="案例详情">
        {!detail ? <div className="admin-empty-detail"><strong>选择一个案例</strong><span>查看康复记录、时间线、反馈和版本。</span></div> : <>
          <header className="admin-detail-header"><div><span>{detail.caseRecord.isTestCase ? "测试案例编号" : "案例编号"}</span><h1>{detail.caseRecord.publicCode}</h1></div><div><button type="button" onClick={() => void exportCase()}>脱敏导出</button><button type="button" className="is-danger" disabled={detail.caseRecord.status === "deleted"} onClick={() => void deleteCase()}>删除案例</button></div></header>
          <dl className="admin-facts"><div><dt>当前阶段</dt><dd>{detail.caseRecord.currentStage ?? "未记录"}</dd></div><div><dt>康复记录</dt><dd>{detail.caseRecord.sessionCount} 次</dd></div><div><dt>快照修订</dt><dd>{detail.snapshot.revision}</dd></div><div><dt>来源渠道</dt><dd>{SOURCE_LABELS[detail.caseRecord.sourceChannel ?? "unknown"] ?? detail.caseRecord.sourceChannel}{detail.caseRecord.sourceDetail ? `（${detail.caseRecord.sourceDetail}）` : ""}</dd></div>{detail.caseRecord.isTestCase ? <><div><dt>测试场景</dt><dd>{detail.caseRecord.scenarioId ?? "未记录"}</dd></div><div><dt>运行批次</dt><dd>{detail.caseRecord.testRunId ?? "未记录"}</dd></div></> : null}<div><dt>应用版本</dt><dd>{detail.caseRecord.appVersion}</dd></div><div><dt>知识 / 决策</dt><dd>{detail.caseRecord.knowledgeVersion} / {detail.caseRecord.decisionVersion}</dd></div></dl>

          <section className="admin-detail-section"><header><h2>问题反馈</h2><span>{detail.feedback.length}</span></header>{detail.feedback.map((item) => <div className="admin-feedback-row" key={item.id}><div><strong>{item.kind}</strong><p>{item.message || "未填写补充说明"}</p><span>目标：第 {item.sessionNumber ?? "?"} 次 · {item.stage}</span><small>提交位置：{item.sourceStage ?? "未定位"} · {new Date(item.createdAt).toLocaleString("zh-CN")}</small></div><select aria-label={`反馈 ${item.id} 状态`} value={item.status} onChange={(event) => void updateFeedback(item.id, event.target.value)}>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>)}{!detail.feedback.length ? <p className="admin-empty">暂无反馈</p> : null}</section>

          <section className="admin-detail-section"><header><h2>内部备注</h2><span>{detail.adminNotes.length}</span></header><div className="admin-note-entry"><textarea value={note} maxLength={2000} onChange={(event) => setNote(event.target.value)} placeholder="记录复现结论或后续处理" /><button type="button" disabled={!note.trim()} onClick={() => void addNote()}>添加备注</button></div>{detail.adminNotes.map((item) => <div className="admin-note" key={item.id}><p>{item.note}</p><small>{new Date(item.createdAt).toLocaleString("zh-CN")}</small></div>)}</section>

          <section className="admin-detail-section"><header><h2>事件时间线</h2><span>{detail.events.length}</span></header><ol className="admin-timeline">{detail.events.map((event) => <li key={event.id}><b>{event.sequence}</b><div><strong>{event.type}</strong><span>{event.source} · {new Date(event.occurredAt).toLocaleString("zh-CN")}</span></div></li>)}</ol></section>

          <section className="admin-detail-section"><header><h2>完整记录</h2><span>修订 {detail.snapshot.revision}</span></header><details className="admin-snapshot"><summary>查看已确认的案例快照</summary><pre>{JSON.stringify(detail.snapshot.payload, null, 2)}</pre></details></section>

          <section className="admin-detail-section"><header><h2>管理审计</h2><span>{detail.adminAudit.length}</span></header><ol className="admin-timeline">{detail.adminAudit.map((event, index) => <li key={event.id}><b>{index + 1}</b><div><strong>{event.action}</strong><span>{new Date(event.occurredAt).toLocaleString("zh-CN")}</span></div></li>)}</ol></section>
        </>}
      </section>
    </div>
  </main>;
}
