import {
  PilotCaseNotFoundError,
  PilotCaseValidationError,
  type PilotAdminNoteRecord,
  type PilotAdminAuditAction,
  type PilotAdminAuditRecord,
  type PilotCaseFeedbackStatus,
  type PilotCaseRepository,
  type PilotReleaseVersions,
} from "@/src/infrastructure/pilot/api/case-contracts";
import { resolvePurgeCutoffs, type PurgeInput } from "@/src/infrastructure/pilot/services/case-service";
import { buildPilotCaseView, publicPilotCaseRecord, type PilotCaseView, type PublicPilotCaseRecord } from "@/src/infrastructure/pilot/services/case-view";
import { inspectPilotTimelineInvariants, type PilotWorkflowInvariantCode } from "@/src/features/rehabmind/workflow/workflow-invariants";

export type PilotAdminCaseView = PilotCaseView & { adminNotes: PilotAdminNoteRecord[]; adminAudit: PilotAdminAuditRecord[] };
export type PilotAdminCaseQuery = {
  publicCode?: string;
  status?: "active" | "deleted";
  feedbackStatus?: PilotCaseFeedbackStatus;
  appVersion?: string;
  knowledgeVersion?: string;
  decisionVersion?: string;
  sessionNumber?: number;
  createdFrom?: string;
  createdTo?: string;
  sort?: "newest" | "oldest";
  cursor?: string;
  limit?: number;
  isTestCase?: boolean;
};

export type PilotAdminCaseSummary = {
  caseRecord: PublicPilotCaseRecord;
  feedbackCount: number;
  openFeedbackCount: number;
  latestEventAt: string | null;
  invariantCodes: PilotWorkflowInvariantCode[];
};

type PilotCaseAdminServiceOptions = {
  versions?: PilotReleaseVersions;
  now?: () => string;
  createId?: () => string;
};

const FEEDBACK_STATUSES: PilotCaseFeedbackStatus[] = ["open", "in_review", "resolved", "dismissed"];
const FREE_TEXT_KEYS = new Set(["description", "professionalNotes", "customAction", "message", "note", "detail", "text"]);

function redactPilotExportValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactPilotExportValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).flatMap(([key, item]) => {
    if (/token|accessTokenHash/i.test(key)) return [];
    if (FREE_TEXT_KEYS.has(key)) return [[key, "[redacted]"]];
    return [[key, redactPilotExportValue(item)]];
  }));
}

function eventInvariantCodes(view: PilotCaseView) {
  const observed = view.events.flatMap((event) => {
    const technical = event.payload.technical;
    if (!technical || typeof technical !== "object" || Array.isArray(technical)) return [];
    const codes = (technical as Record<string, unknown>).invariantCodes;
    return Array.isArray(codes) ? codes.filter((code): code is PilotWorkflowInvariantCode => typeof code === "string") : [];
  });
  const timeline = inspectPilotTimelineInvariants({
    caseStatus: view.caseRecord.status,
    snapshotRevision: view.snapshot.revision,
    caseSessionCount: view.caseRecord.sessionCount,
    events: view.events,
    feedback: view.feedback,
  });
  return [...new Set([...observed, ...timeline])];
}

function cursorFor(record: PublicPilotCaseRecord) {
  return encodeURIComponent(`${record.createdAt}|${record.id}`);
}

export class PilotCaseAdminService {
  private readonly versions: PilotReleaseVersions;
  private readonly now: () => string;
  private readonly createId: () => string;

  constructor(private readonly repository: PilotCaseRepository, options: PilotCaseAdminServiceOptions = {}) {
    this.versions = options.versions ?? { appVersion: "admin", knowledgeVersion: "admin", decisionVersion: "admin" };
    this.now = options.now ?? (() => new Date().toISOString());
    this.createId = options.createId ?? (() => globalThis.crypto.randomUUID());
  }

  private buildAudit(caseId: string, action: PilotAdminAuditAction, targetId: string | null = null, metadata: Record<string, unknown> | null = null): PilotAdminAuditRecord {
    return {
      id: this.createId(),
      caseId,
      action,
      targetId,
      metadata: metadata ? JSON.stringify(metadata) : null,
      ...this.versions,
      occurredAt: this.now(),
    };
  }

  private saveAudit(caseId: string, action: PilotAdminAuditAction, targetId: string | null = null, metadata: Record<string, unknown> | null = null) {
    return this.repository.saveAdminAudit(this.buildAudit(caseId, action, targetId, metadata));
  }

  /** PRIV-02：按截止条件物理清除案例，返回移除数量。 */
  async purgeCases(input: PurgeInput): Promise<number> {
    const cutoffs = resolvePurgeCutoffs(input, Date.now());
    return this.repository.hardDeleteCases(cutoffs);
  }

  async listCases(): Promise<PublicPilotCaseRecord[]> {
    const cases = await this.repository.listCases();
    return cases.map(publicPilotCaseRecord);
  }

  async deleteTestRun(testRunId: string): Promise<number> {
    if (!/^[A-Za-z0-9_-]{8,128}$/.test(testRunId)) throw new PilotCaseValidationError("testRunId is invalid");
    return this.repository.hardDeleteTestRun(testRunId);
  }

  async searchCases(query: PilotAdminCaseQuery = {}) {
    const limit = query.limit ?? 30;
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new PilotCaseValidationError("limit must be between 1 and 100");
    if (query.sessionNumber !== undefined && (!Number.isInteger(query.sessionNumber) || query.sessionNumber < 1)) {
      throw new PilotCaseValidationError("sessionNumber must be a positive integer");
    }
    for (const [label, value] of [["createdFrom", query.createdFrom], ["createdTo", query.createdTo]] as const) {
      if (value && !Number.isFinite(Date.parse(value))) throw new PilotCaseValidationError(`${label} must be an ISO date`);
    }

    const cases = await this.repository.listCases();
    const hydrated = await Promise.all(cases.map(async (caseRecord): Promise<PilotAdminCaseSummary> => {
      const [snapshot, events, feedback] = await Promise.all([
        this.repository.getSnapshot(caseRecord.id),
        this.repository.getEventsByCaseId(caseRecord.id),
        this.repository.getFeedbackByCaseId(caseRecord.id),
      ]);
      if (!snapshot) throw new PilotCaseNotFoundError("Case snapshot not found");
      const view = buildPilotCaseView(caseRecord, snapshot, events, feedback);
      return {
        caseRecord: publicPilotCaseRecord(caseRecord),
        feedbackCount: feedback.length,
        openFeedbackCount: feedback.filter((item) => item.status === "open" || item.status === "in_review").length,
        latestEventAt: events.at(-1)?.occurredAt ?? null,
        invariantCodes: eventInvariantCodes(view),
      };
    }));

    const publicCode = query.publicCode?.trim().toUpperCase();
    const filtered = hydrated.filter((item) => {
      const record = item.caseRecord;
      if (publicCode && record.publicCode.toUpperCase() !== publicCode) return false;
      if (query.status && record.status !== query.status) return false;
      if (query.isTestCase !== undefined && record.isTestCase !== query.isTestCase) return false;
      if (query.appVersion && record.appVersion !== query.appVersion) return false;
      if (query.knowledgeVersion && record.knowledgeVersion !== query.knowledgeVersion) return false;
      if (query.decisionVersion && record.decisionVersion !== query.decisionVersion) return false;
      if (query.sessionNumber && record.sessionCount < query.sessionNumber) return false;
      if (query.createdFrom && record.createdAt < new Date(query.createdFrom).toISOString()) return false;
      if (query.createdTo && record.createdAt > new Date(query.createdTo).toISOString()) return false;
      if (query.feedbackStatus && !item.feedbackCount) return false;
      return true;
    });

    let feedbackFiltered = filtered;
    if (query.feedbackStatus) {
      feedbackFiltered = [];
      for (const item of filtered) {
        const feedback = await this.repository.getFeedbackByCaseId(item.caseRecord.id);
        if (feedback.some((entry) => entry.status === query.feedbackStatus)) feedbackFiltered.push(item);
      }
    }
    feedbackFiltered.sort((left, right) => {
      const order = left.caseRecord.createdAt.localeCompare(right.caseRecord.createdAt) || left.caseRecord.id.localeCompare(right.caseRecord.id);
      return query.sort === "oldest" ? order : -order;
    });

    let start = 0;
    if (query.cursor) {
      let decoded: string;
      try {
        decoded = decodeURIComponent(query.cursor);
      } catch {
        throw new PilotCaseValidationError("cursor is invalid or stale");
      }
      start = feedbackFiltered.findIndex((item) => `${item.caseRecord.createdAt}|${item.caseRecord.id}` === decoded) + 1;
      if (start === 0) throw new PilotCaseValidationError("cursor is invalid or stale");
    }
    const casesPage = feedbackFiltered.slice(start, start + limit);
    const hasMore = start + limit < feedbackFiltered.length;
    return {
      cases: casesPage,
      page: {
        total: feedbackFiltered.length,
        nextCursor: hasMore && casesPage.length ? cursorFor(casesPage.at(-1)!.caseRecord) : null,
      },
    };
  }

  async getTrialMetrics() {
    const [allCases, allTrialEvents] = await Promise.all([this.repository.listCases(), this.repository.listTrialEvents()]);
    const testCaseIds = new Set(allCases.filter((item) => item.isTestCase).map((item) => item.id));
    const cases = allCases.filter((item) => !item.isTestCase);
    const trialEvents = allTrialEvents.filter((event) => !event.caseId || !testCaseIds.has(event.caseId));
    const caseDetails = await Promise.all(cases.map(async (caseRecord) => {
      const [snapshot, events, feedback] = await Promise.all([
        this.repository.getSnapshot(caseRecord.id),
        this.repository.getEventsByCaseId(caseRecord.id),
        this.repository.getFeedbackByCaseId(caseRecord.id),
      ]);
      const invariantCodes = snapshot
        ? eventInvariantCodes(buildPilotCaseView(caseRecord, snapshot, events, feedback))
        : [];
      return { caseRecord, events, feedback, invariantCodes };
    }));
    const countTrial = (type: string) => trialEvents.filter((event) => event.eventType === type).length;
    const sourceChannels = Object.fromEntries([...new Set(cases.map((item) => item.sourceChannel ?? "unknown"))].map((source) => [
      source,
      cases.filter((item) => (item.sourceChannel ?? "unknown") === source).length,
    ]));
    const feedback = caseDetails.flatMap((item) => item.feedback);
    const casesWithFeedback = new Set(feedback.map((item) => item.caseId)).size;
    const invariantCases = caseDetails.filter((item) => item.invariantCodes.length);
    const errorByBuild = Object.fromEntries([...new Set(invariantCases.map((item) => item.caseRecord.appVersion))].map((version) => [
      version,
      invariantCases.filter((item) => item.caseRecord.appVersion === version).length,
    ]));
    const stageExits = Object.fromEntries([...new Set(cases.map((item) => item.currentStage ?? "unknown"))].map((stage) => [
      stage,
      cases.filter((item) => (item.currentStage ?? "unknown") === stage).length,
    ]));
    const ratio = (numerator: number, denominator: number) => denominator ? Number((numerator / denominator).toFixed(4)) : 0;

    return {
      casesCreated: cases.length,
      sourceChannels,
      tutorial: { completed: countTrial("tutorial_completed"), skipped: countTrial("tutorial_skipped") },
      consent: { confirmed: countTrial("consent_confirmed"), declined: countTrial("consent_declined") },
      firstSession: {
        completed: cases.filter((item) => item.sessionCount >= 1).length,
        completionRate: ratio(cases.filter((item) => item.sessionCount >= 1).length, cases.length),
        stageExits,
      },
      persistence: {
        saved: caseDetails.flatMap((item) => item.events).filter((event) => event.type === "session_saved").length,
        recovered: countTrial("case_recovered"),
        failed: countTrial("save_failed"),
        conflicts: countTrial("save_conflict"),
      },
      followup: {
        created: cases.filter((item) => item.sessionCount >= 2).length,
        rate: ratio(cases.filter((item) => item.sessionCount >= 2).length, cases.length),
      },
      feedback: {
        submitted: feedback.length,
        submissionRate: ratio(casesWithFeedback, cases.length),
        reproduced: feedback.filter((item) => item.status === "in_review" || item.status === "resolved").length,
      },
      invariants: {
        totalCases: invariantCases.length,
        codes: Object.fromEntries([...new Set(invariantCases.flatMap((item) => item.invariantCodes))].map((code) => [
          code,
          invariantCases.filter((item) => item.invariantCodes.includes(code)).length,
        ])),
      },
      errorsByBuild: errorByBuild,
    };
  }

  async readCase(caseId: string): Promise<PilotAdminCaseView> {
    const caseRecord = await this.repository.getCaseById(caseId);
    if (!caseRecord) throw new PilotCaseNotFoundError();
    const [snapshot, events, feedback, adminNotes, adminAudit] = await Promise.all([
      this.repository.getSnapshot(caseId),
      this.repository.getEventsByCaseId(caseId),
      this.repository.getFeedbackByCaseId(caseId),
      this.repository.getAdminNotesByCaseId(caseId),
      this.repository.getAdminAuditByCaseId(caseId),
    ]);
    if (!snapshot) throw new PilotCaseNotFoundError("Case snapshot not found");
    return { ...buildPilotCaseView(caseRecord, snapshot, events, feedback), adminNotes, adminAudit };
  }

  async readCaseWithAudit(caseId: string): Promise<PilotAdminCaseView> {
    if (!await this.repository.getCaseById(caseId)) throw new PilotCaseNotFoundError();
    await this.saveAudit(caseId, "case_full_viewed");
    return this.readCase(caseId);
  }

  async readCaseByPublicCode(publicCode: string, auditFullView = false): Promise<PilotCaseView> {
    const normalized = publicCode.trim();
    if (!normalized) throw new PilotCaseNotFoundError();
    const caseRecord = await this.repository.getCaseByPublicCode(normalized);
    if (!caseRecord) throw new PilotCaseNotFoundError();
    return auditFullView ? this.readCaseWithAudit(caseRecord.id) : this.readCase(caseRecord.id);
  }

  async addNote(caseId: string, note: string) {
    const normalized = note.trim();
    if (!normalized || normalized.length > 2000) throw new PilotCaseValidationError("admin note must be between 1 and 2000 characters");
    if (!await this.repository.getCaseById(caseId)) throw new PilotCaseNotFoundError();
    const noteRecord: PilotAdminNoteRecord = {
      id: this.createId(),
      caseId,
      note: normalized,
      author: "admin",
      createdAt: this.now(),
    };
    return this.repository.saveAdminNote(noteRecord, this.buildAudit(caseId, "note_added", noteRecord.id));
  }

  async updateFeedbackStatus(caseId: string, feedbackId: string, status: string) {
    if (!FEEDBACK_STATUSES.includes(status as PilotCaseFeedbackStatus)) {
      throw new PilotCaseValidationError("unsupported feedback status");
    }
    const feedback = await this.repository.getFeedbackByCaseId(caseId);
    if (!feedback.some((item) => item.id === feedbackId)) throw new PilotCaseNotFoundError("Feedback not found");
    return this.repository.updateFeedbackStatus({
      caseId,
      feedbackId,
      status: status as PilotCaseFeedbackStatus,
      updatedAt: this.now(),
      adminAudit: this.buildAudit(caseId, "feedback_status_updated", feedbackId, { status }),
    });
  }

  async deleteCase(caseId: string) {
    const caseRecord = await this.repository.getCaseById(caseId);
    if (!caseRecord || caseRecord.status !== "active") throw new PilotCaseNotFoundError();
    const deletedAt = this.now();
    return publicPilotCaseRecord(await this.repository.deleteCase({
      caseId,
      deletedAt,
      event: {
        id: this.createId(),
        type: "case_deleted",
        payload: JSON.stringify({ source: "admin" }),
        source: "admin",
        occurredAt: deletedAt,
        ...this.versions,
      },
      adminAudit: this.buildAudit(caseId, "case_deleted"),
    }));
  }

  async exportRedactedCase(caseId: string) {
    if (!await this.repository.getCaseById(caseId)) throw new PilotCaseNotFoundError();
    await this.saveAudit(caseId, "case_exported");
    const view = await this.readCase(caseId);
    return redactPilotExportValue({ schemaVersion: 1, exportedAt: this.now(), ...view });
  }
}
