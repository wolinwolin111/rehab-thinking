"use client";

import type { PilotCaseAccess } from "@/src/infrastructure/pilot/api/case-client";
import type { PilotTrialEventType } from "@/src/infrastructure/pilot/api/case-contracts";

const FLOW_ID_KEY = "rehabmind-pilot-flow-id";

export function getPilotFirstUseFlowId() {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.sessionStorage.getItem(FLOW_ID_KEY)?.trim();
    if (stored) return stored;
    const flowId = globalThis.crypto.randomUUID();
    window.sessionStorage.setItem(FLOW_ID_KEY, flowId);
    return flowId;
  } catch {
    return globalThis.crypto?.randomUUID?.() ?? null;
  }
}

async function postTrialEvent(input: {
  eventType: PilotTrialEventType;
  flowId: string;
  caseId?: string;
  accessToken?: string;
}) {
  const headers = new Headers({ "content-type": "application/json" });
  if (input.accessToken) headers.set("authorization", `Bearer ${input.accessToken}`);
  const response = await fetch("/api/pilot/trial-events", {
    method: "POST",
    headers,
    body: JSON.stringify({ eventType: input.eventType, flowId: input.flowId, caseId: input.caseId }),
  });
  return response.ok;
}

export async function recordPilotFirstUseEvent(eventType: Extract<PilotTrialEventType,
  "tutorial_completed" | "tutorial_skipped" | "consent_confirmed" | "consent_declined"
>) {
  const flowId = getPilotFirstUseFlowId();
  if (!flowId) return false;
  try {
    return await postTrialEvent({ eventType, flowId });
  } catch {
    return false;
  }
}

export async function recordPilotCaseOperation(
  eventType: Extract<PilotTrialEventType, "case_recovered" | "save_failed" | "save_conflict">,
  access: Pick<PilotCaseAccess, "caseId" | "accessToken">,
) {
  const flowId = getPilotFirstUseFlowId();
  if (!flowId) return false;
  try {
    return await postTrialEvent({ eventType, flowId, caseId: access.caseId, accessToken: access.accessToken });
  } catch {
    return false;
  }
}
