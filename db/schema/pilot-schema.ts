import { integer, index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/**
 * Persistence-only schema for the anonymous rehabilitation pilot.
 *
 * The JSON payloads intentionally stay opaque to this layer. The application
 * service validates their shape before writing them, while the decision core
 * remains independent of Drizzle and D1.
 */
export const pilotCases = sqliteTable("pilot_cases", {
  id: text("id").primaryKey(),
  clientCreationId: text("client_creation_id").notNull().default(""),
  publicCode: text("public_code").notNull(),
  accessTokenHash: text("access_token_hash").notNull(),
  inviteTokenHash: text("invite_token_hash"),
  inviteSource: text("invite_source"),
  sourceChannel: text("source_channel"),
  sourceDetail: text("source_detail"),
  consentVersion: text("consent_version"),
  consentConfirmedAt: text("consent_confirmed_at"),
  isTestCase: integer("is_test_case", { mode: "boolean" }).notNull().default(false),
  testRunId: text("test_run_id"),
  scenarioId: text("scenario_id"),
  createdBy: text("created_by"),
  firstUseFlowId: text("first_use_flow_id"),
  status: text("status").notNull().default("active"),
  currentStage: text("current_stage"),
  isTrial: integer("is_trial", { mode: "boolean" }).notNull().default(true),
  isBilateral: integer("is_bilateral", { mode: "boolean" }).notNull().default(false),
  hasSafetyStop: integer("has_safety_stop", { mode: "boolean" }).notNull().default(false),
  sessionCount: integer("session_count").notNull().default(0),
  appVersion: text("app_version").notNull(),
  knowledgeVersion: text("knowledge_version").notNull(),
  decisionVersion: text("decision_version").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  deletedAt: text("deleted_at"),
}, (table) => ({
  clientCreationIdUnique: uniqueIndex("pilot_cases_client_creation_id_unique").on(table.clientCreationId),
  publicCodeUnique: uniqueIndex("pilot_cases_public_code_unique").on(table.publicCode),
  statusIndex: index("pilot_cases_status_idx").on(table.status),
  createdAtIndex: index("pilot_cases_created_at_idx").on(table.createdAt),
  inviteHashIndex: index("pilot_cases_invite_hash_idx").on(table.inviteTokenHash),
  sourceChannelIndex: index("pilot_cases_source_channel_idx").on(table.sourceChannel),
  testRunIndex: index("pilot_cases_test_run_idx").on(table.testRunId),
}));

/** One current snapshot per case; history lives in caseEvents. */
export const caseSnapshots = sqliteTable("case_snapshots", {
  caseId: text("case_id")
    .primaryKey()
    .references(() => pilotCases.id, { onDelete: "cascade" }),
  revision: integer("revision").notNull().default(0),
  payload: text("payload").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/** Append-only timeline used to reconstruct what happened during a case. */
export const caseEvents = sqliteTable("case_events", {
  id: text("id").primaryKey(),
  caseId: text("case_id")
    .notNull()
    .references(() => pilotCases.id, { onDelete: "cascade" }),
  sequence: integer("sequence").notNull(),
  type: text("type").notNull(),
  payload: text("payload").notNull(),
  source: text("source").notNull(),
  occurredAt: text("occurred_at").notNull(),
  appVersion: text("app_version").notNull(),
  knowledgeVersion: text("knowledge_version").notNull(),
  decisionVersion: text("decision_version").notNull(),
}, (table) => ({
  caseSequenceUnique: uniqueIndex("case_events_case_sequence_unique").on(table.caseId, table.sequence),
  caseIndex: index("case_events_case_idx").on(table.caseId),
  typeIndex: index("case_events_type_idx").on(table.type),
}));

export const caseFeedback = sqliteTable("case_feedback", {
  id: text("id").primaryKey(),
  caseId: text("case_id")
    .notNull()
    .references(() => pilotCases.id, { onDelete: "cascade" }),
  eventId: text("event_id").references(() => caseEvents.id, { onDelete: "set null" }),
  sessionNumber: integer("session_number"),
  stage: text("stage").notNull(),
  kind: text("kind").notNull(),
  message: text("message"),
  payload: text("payload"),
  source: text("source").notNull().default("in_app"),
  sourceSessionNumber: integer("source_session_number"),
  sourceStage: text("source_stage"),
  sourceEventId: text("source_event_id").references(() => caseEvents.id, { onDelete: "set null" }),
  status: text("status").notNull().default("open"),
  appVersion: text("app_version").notNull().default("legacy"),
  knowledgeVersion: text("knowledge_version").notNull().default("legacy"),
  decisionVersion: text("decision_version").notNull().default("legacy"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at"),
}, (table) => ({
  caseIndex: index("case_feedback_case_idx").on(table.caseId),
  stageIndex: index("case_feedback_stage_idx").on(table.stage),
  sessionIndex: index("case_feedback_session_idx").on(table.caseId, table.sessionNumber),
  sourceIndex: index("case_feedback_source_idx").on(table.source),
  statusIndex: index("case_feedback_status_idx").on(table.status),
}));

export const appReleases = sqliteTable("app_releases", {
  version: text("version").primaryKey(),
  releasedAt: text("released_at").notNull(),
  notes: text("notes"),
});

export const knowledgeReleases = sqliteTable("knowledge_releases", {
  version: text("version").primaryKey(),
  releasedAt: text("released_at").notNull(),
  notes: text("notes"),
});

export const decisionReleases = sqliteTable("decision_releases", {
  version: text("version").primaryKey(),
  releasedAt: text("released_at").notNull(),
  notes: text("notes"),
});

export const adminNotes = sqliteTable("admin_notes", {
  id: text("id").primaryKey(),
  caseId: text("case_id")
    .notNull()
    .references(() => pilotCases.id, { onDelete: "cascade" }),
  note: text("note").notNull(),
  author: text("author").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => ({
  caseIndex: index("admin_notes_case_idx").on(table.caseId),
}));

export const pilotTrialEvents = sqliteTable("pilot_trial_events", {
  id: text("id").primaryKey(),
  dedupeKey: text("dedupe_key").notNull(),
  flowId: text("flow_id").notNull(),
  eventType: text("event_type").notNull(),
  caseId: text("case_id"),
  inviteSource: text("invite_source"),
  appVersion: text("app_version").notNull(),
  knowledgeVersion: text("knowledge_version").notNull(),
  decisionVersion: text("decision_version").notNull(),
  occurredAt: text("occurred_at").notNull(),
}, (table) => ({
  dedupeKeyUnique: uniqueIndex("pilot_trial_events_dedupe_key_unique").on(table.dedupeKey),
  flowIndex: index("pilot_trial_events_flow_idx").on(table.flowId),
  caseIndex: index("pilot_trial_events_case_idx").on(table.caseId),
  typeIndex: index("pilot_trial_events_type_idx").on(table.eventType),
}));

export const pilotAdminAudit = sqliteTable("pilot_admin_audit", {
  id: text("id").primaryKey(),
  caseId: text("case_id").notNull(),
  action: text("action").notNull(),
  targetId: text("target_id"),
  metadata: text("metadata"),
  appVersion: text("app_version").notNull(),
  knowledgeVersion: text("knowledge_version").notNull(),
  decisionVersion: text("decision_version").notNull(),
  occurredAt: text("occurred_at").notNull(),
}, (table) => ({
  caseIndex: index("pilot_admin_audit_case_idx").on(table.caseId),
  actionIndex: index("pilot_admin_audit_action_idx").on(table.action),
}));

export const knowledgeGapCandidates = sqliteTable("knowledge_gap_candidates", {
  id: text("id").primaryKey(),
  caseId: text("case_id")
    .notNull()
    .references(() => pilotCases.id, { onDelete: "cascade" }),
  sourceEventId: text("source_event_id").references(() => caseEvents.id, { onDelete: "set null" }),
  category: text("category").notNull(),
  label: text("label").notNull(),
  detail: text("detail"),
  status: text("status").notNull().default("observed"),
  createdAt: text("created_at").notNull(),
}, (table) => ({
  caseIndex: index("knowledge_gap_candidates_case_idx").on(table.caseId),
  statusIndex: index("knowledge_gap_candidates_status_idx").on(table.status),
}));
