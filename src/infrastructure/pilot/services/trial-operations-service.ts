import {
  assertPilotReleaseVersions,
  assertPilotTrialEventType,
  PilotCaseNotFoundError,
  PilotCaseUnauthorizedError,
  PilotCaseValidationError,
  type PilotCaseRepository,
  type PilotReleaseVersions,
  type PilotTrialEventType,
} from "@/src/infrastructure/pilot/api/case-contracts";

const CASE_EVENTS = new Set<PilotTrialEventType>(["case_recovered", "save_failed", "save_conflict"]);

async function hashToken(token: string) {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export class PilotTrialOperationsService {
  private readonly now: () => string;
  private readonly createId: () => string;

  constructor(
    private readonly repository: PilotCaseRepository,
    private readonly versions: PilotReleaseVersions,
    options: { now?: () => string; createId?: () => string } = {},
  ) {
    assertPilotReleaseVersions(versions);
    this.now = options.now ?? (() => new Date().toISOString());
    this.createId = options.createId ?? (() => globalThis.crypto.randomUUID());
  }

  async record(input: {
    eventType: string;
    flowId: string;
    caseId?: string;
    accessToken?: string;
  }) {
    assertPilotTrialEventType(input.eventType);
    const flowId = input.flowId.trim();
    if (!/^[A-Za-z0-9_-]{8,128}$/.test(flowId)) {
      throw new PilotCaseValidationError("flowId must be 8 to 128 URL-safe characters");
    }

    let caseId: string | null = null;
    if (CASE_EVENTS.has(input.eventType)) {
      caseId = input.caseId?.trim() || null;
      if (!caseId || !input.accessToken) throw new PilotCaseUnauthorizedError();
      const caseRecord = await this.repository.getCaseById(caseId);
      if (!caseRecord || caseRecord.status !== "active") throw new PilotCaseNotFoundError();
      if (await hashToken(input.accessToken) !== caseRecord.accessTokenHash) throw new PilotCaseUnauthorizedError();
      if (caseRecord.firstUseFlowId && caseRecord.firstUseFlowId !== flowId) {
        throw new PilotCaseValidationError("flowId does not belong to this case");
      }
    }

    return this.repository.saveTrialEvent({
      id: this.createId(),
      dedupeKey: `${flowId}:${input.eventType}:${caseId ?? "first-use"}`,
      flowId,
      eventType: input.eventType,
      caseId,
      ...this.versions,
      occurredAt: this.now(),
    });
  }
}
