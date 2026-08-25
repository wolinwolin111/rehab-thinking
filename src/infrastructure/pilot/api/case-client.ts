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
  inviteToken?: string | null;
}): Promise<PilotCaseAccess> {
  const inviteToken = input.inviteToken ?? getPilotInviteToken();
  const result = await requestJson<{ case: PilotCaseAccess }>("/api/pilot/cases", {
    method: "POST",
    headers: inviteToken ? { "x-pilot-invite-token": inviteToken } : undefined,
    body: JSON.stringify({
      clientCreationId: input.clientCreationId,
      accessToken: input.accessToken,
      initialSnapshot: input.initialSnapshot,
      currentStage: input.currentStage,
      isBilateral: input.isBilateral,
      hasSafetyStop: input.hasSafetyStop,
    }),
  });
  return result.case;
}

export async function savePilotCaseProgress(input: SavePilotCaseProgressInput): Promise<SavePilotCaseProgressResult> {
  const result = await requestJson<{ progress: SavePilotCaseProgressResult }>(`/api/pilot/cases/${encodeURIComponent(input.access.caseId)}/progress`, {
    method: "POST",
    headers: accessHeaders(input.access.accessToken),
    body: JSON.stringify({
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
import { getPilotInviteToken } from "./pilot-invite-client";
