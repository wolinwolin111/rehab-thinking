import { getPilotFirstUseFlowId } from "@/src/infrastructure/pilot/api/trial-operations-client";

export type PilotCaseAccess = {
  caseId: string;
  publicCode: string;
  accessToken: string;
  revision: number;
  versions: {
    appVersion: string;
    knowledgeVersion: string;
    decisionVersion: string;
  };
  replayed?: boolean;
};

export type PilotTestContext = { testRunId: string; scenarioId: string; createdBy: "test_workbench" };

export type PilotCaseView = {
  caseRecord: Record<string, unknown>;
  snapshot: {
    caseId: string;
    revision: number;
    payload: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
  };
  events: Array<Record<string, unknown>>;
  feedback: Array<Record<string, unknown>>;
};

export type SavePilotCaseProgressInput = {
  access: PilotCaseAccess;
  requestId: string;
  sessionId: string;
  snapshot: unknown;
  eventId: string;
  eventType: string;
  eventPayload: unknown;
  currentStage: string;
  isBilateral: boolean;
  hasSafetyStop: boolean;
  sessionCount: number;
};

export type SavePilotCaseProgressResult = {
  caseRecord: Record<string, unknown>;
  snapshot: PilotCaseView["snapshot"];
  event: Record<string, unknown>;
};

export class PilotCaseClientError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
    this.name = "PilotCaseClientError";
  }
}

export const PILOT_REQUEST_TIMEOUT_MS = 12000;

export function createPilotClientCreationId() {
  return globalThis.crypto?.randomUUID?.() ?? `creation-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createPilotAccessToken() {
  const bytes = new Uint8Array(32);
  globalThis.crypto?.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("") || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), PILOT_REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(input, { ...init, signal: controller.signal, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
  } catch {
    throw new PilotCaseClientError(0, controller.signal.aborted ? "timeout" : "network", controller.signal.aborted ? "Request timed out" : "Network unavailable");
  } finally {
    globalThis.clearTimeout(timeout);
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  if (!response.ok) {
    const errorBody = body && typeof body === "object" ? body as { error?: unknown; code?: unknown } : {};
    throw new PilotCaseClientError(
      response.status,
      typeof errorBody.code === "string" ? errorBody.code : "storage",
      typeof errorBody.error === "string" ? errorBody.error : "Case service is temporarily unavailable",
    );
  }
  return body as T;
}

function accessHeaders(accessToken: string): HeadersInit {
  return { authorization: `Bearer ${accessToken}` };
}

export async function createPilotCase(input: {
  clientCreationId: string;
  accessToken: string;
  initialSnapshot: unknown;
  currentStage: string;
  isBilateral: boolean;
  hasSafetyStop: boolean;
  source: import("@/src/infrastructure/pilot/onboarding/source-channel").PilotSourceRecord;
  consent: import("@/src/infrastructure/pilot/consent/consent-core").PilotConsentRecord;
  testContext?: PilotTestContext;
}): Promise<PilotCaseAccess> {
  // DEF-CONSENT-01：这里的运行时动态 import 在 dev 长会话下曾随页面异步状态
  // 整体停滞（挂点漂移：有时挂在模块加载、有时挂在后续 IndexedDB 写入），
  // 改为静态导入，消除首用建案路径上的动态模块请求。
  const result = await requestJson<{ case: PilotCaseAccess }>(input.testContext ? "/api/pilot/test/cases" : "/api/pilot/cases", {
    method: "POST",
    body: JSON.stringify({
      clientCreationId: input.clientCreationId,
      accessToken: input.accessToken,
      initialSnapshot: input.initialSnapshot,
      currentStage: input.currentStage,
      isBilateral: input.isBilateral,
      hasSafetyStop: input.hasSafetyStop,
      firstUseFlowId: getPilotFirstUseFlowId(),
      source: input.source,
      consent: input.consent,
      testRunId: input.testContext?.testRunId,
      scenarioId: input.testContext?.scenarioId,
    }),
  });
  return result.case;
}

export async function savePilotCaseProgress(input: SavePilotCaseProgressInput): Promise<SavePilotCaseProgressResult> {
  const result = await requestJson<{ progress: SavePilotCaseProgressResult }>(`/api/pilot/cases/${encodeURIComponent(input.access.caseId)}/progress`, {
    method: "POST",
    headers: { ...accessHeaders(input.access.accessToken), "x-pilot-request-id": input.requestId },
    body: JSON.stringify({
      requestId: input.requestId,
      caseId: input.access.caseId,
      sessionId: input.sessionId,
      baseRevision: input.access.revision,
      expectedRevision: input.access.revision,
      snapshot: input.snapshot,
      eventId: input.eventId,
      eventType: input.eventType,
      eventPayload: input.eventPayload,
      currentStage: input.currentStage,
      isBilateral: input.isBilateral,
      hasSafetyStop: input.hasSafetyStop,
      sessionCount: input.sessionCount,
    }),
  });
  return result.progress;
}

export async function readPilotCase(access: Pick<PilotCaseAccess, "caseId" | "accessToken">): Promise<PilotCaseView> {
  const result = await requestJson<{ case: PilotCaseView }>(`/api/pilot/cases/${encodeURIComponent(access.caseId)}`, {
    headers: accessHeaders(access.accessToken),
  });
  return result.case;
}

export async function deletePilotCase(access: Pick<PilotCaseAccess, "caseId" | "accessToken">) {
  const result = await requestJson<{ case: Record<string, unknown> }>(`/api/pilot/cases/${encodeURIComponent(access.caseId)}`, {
    method: "DELETE",
    headers: accessHeaders(access.accessToken),
  });
  return result.case;
}

export async function submitPilotCaseFeedback(input: {
  access: Pick<PilotCaseAccess, "caseId" | "accessToken">;
  sessionNumber?: number | null;
  stage: string;
  kind: string;
  message?: string;
  eventId?: string | null;
  sourceSessionNumber?: number | null;
  sourceStage?: string | null;
  sourceEventId?: string | null;
}) {
  const result = await requestJson<{ feedback: Record<string, unknown> }>(`/api/pilot/cases/${encodeURIComponent(input.access.caseId)}/feedback`, {
    method: "POST",
    headers: accessHeaders(input.access.accessToken),
    body: JSON.stringify({
      sessionNumber: input.sessionNumber ?? undefined,
      stage: input.stage,
      kind: input.kind,
      message: input.message?.trim() || undefined,
      eventId: input.eventId ?? undefined,
      sourceSessionNumber: input.sourceSessionNumber ?? undefined,
      sourceStage: input.sourceStage ?? undefined,
      sourceEventId: input.sourceEventId ?? undefined,
    }),
  });
  return result.feedback;
}
