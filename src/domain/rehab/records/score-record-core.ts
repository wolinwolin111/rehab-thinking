export type ScoreRecordState = "unselected" | "confirmed" | "superseded" | "not-applicable";
export type ScoreStage = "intake" | "assessment" | "treatment-retest" | "training-retest" | "followup";
export type ScoreScaleVersion = "nrs-0-10-v1";
export type ScoreSource = "user" | "professional" | "legacy-migrated";
export type ScoreSide = "left" | "right" | "bilateral" | "midline";

export type ScoreRecord = {
  scoreRecordId: string;
  caseId: string;
  problemThreadId: string;
  sessionId: string;
  assessmentRevision: number;
  scoreState: ScoreRecordState;
  value?: number;
  actionId?: string;
  directionId?: string;
  side?: ScoreSide;
  stage: ScoreStage;
  context: string;
  scaleVersion: ScoreScaleVersion;
  source: ScoreSource;
  recordedAt: string;
  supersedesScoreRecordId?: string;
};

export type ScoreRecordPair = Pick<ScoreRecord, "scoreState" | "value" | "caseId" | "problemThreadId" | "sessionId" | "actionId" | "directionId" | "side" | "stage" | "context" | "scaleVersion">;

type ScoreAssessmentRecord = {
  symptomScore?: number;
  passiveSymptomScore?: number;
  pairedStrengthScore?: number;
};

/** 最小持久化投影输入；领域层不依赖 React 工作台的完整快照类型。 */
export type ScoreRecordSnapshot = {
  localCaseId?: string;
  problemThreadId?: string;
  sessionId?: string;
  assessmentRevision?: number;
  sessionNumber: number;
  intake: {
    side?: string;
    baselineScore: number;
    baselineScoreConfirmed?: boolean;
    customAction?: string;
    reproduction?: string;
  };
  assessmentResults?: Record<string, ScoreAssessmentRecord>;
  postScore: number;
  postScoreConfirmed?: boolean;
  postDiscomfort?: string;
  movementScores?: Record<string, number>;
  movementScoreConfirmed?: Record<string, boolean>;
  treatmentFinalRetestScore?: number;
  treatmentFinalRetestConfirmed?: boolean;
  finalRetestScore?: number;
  finalRetestConfirmed?: boolean;
  followupScore: number;
  followupScoreConfirmed?: boolean;
  followupPostScore: number;
  followupPostScoreConfirmed?: boolean;
  followupPostDiscomfort?: string;
  followupMovementScores?: Record<string, number>;
  followupMovementScoreConfirmed?: Record<string, boolean>;
  followupFinalScore?: number;
  followupFinalScoreConfirmed?: boolean;
};

function validScore(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 10;
}

function safePart(value: string) {
  return value.replace(/[^a-zA-Z0-9:_-]+/g, "-").replace(/^-+|-+$/g, "") || "unknown";
}

function scoreId(input: Omit<ScoreRecord, "scoreRecordId" | "supersedesScoreRecordId">) {
  return ["score", input.sessionId, input.stage, input.context, input.actionId, input.directionId, input.side, input.assessmentRevision, input.value ?? "unselected"]
    .filter((part) => part !== undefined && part !== "")
    .map((part) => safePart(String(part)))
    .join(":");
}

function sampleKey(record: Pick<ScoreRecord, "caseId" | "problemThreadId" | "sessionId" | "stage" | "context" | "actionId" | "directionId" | "side" | "scaleVersion">) {
  return [record.caseId, record.problemThreadId, record.sessionId, record.stage, record.context, record.actionId, record.directionId, record.side, record.scaleVersion]
    .filter((part) => part !== undefined && part !== "")
    .join("|");
}

function actionAndDirection(id: string) {
  const raw = id.replace(/^(motion|function|strength|special):/, "");
  return {
    actionId: raw || undefined,
    directionId: id.startsWith("motion:") ? raw : undefined,
  };
}

function assessmentSide(snapshot: ScoreRecordSnapshot): ScoreSide | undefined {
  if (snapshot.intake.side === "左侧") return "left";
  if (snapshot.intake.side === "右侧") return "right";
  if (snapshot.intake.side === "双侧/中间") return "bilateral";
  return undefined;
}

function pushScore(
  output: ScoreRecord[],
  snapshot: ScoreRecordSnapshot,
  input: Omit<ScoreRecord, "scoreRecordId" | "supersedesScoreRecordId" | "caseId" | "problemThreadId" | "sessionId" | "assessmentRevision" | "scaleVersion" | "source" | "recordedAt"> & { value?: number },
  recordedAt: string,
) {
  const scoreState: ScoreRecordState = input.scoreState;
  const normalizedValue = scoreState === "confirmed" && validScore(input.value) ? input.value : undefined;
  const record = {
    ...input,
    value: normalizedValue,
    caseId: snapshot.localCaseId ?? "legacy-case",
    problemThreadId: snapshot.problemThreadId ?? "legacy-thread",
    sessionId: snapshot.sessionId ?? `legacy-session-${snapshot.sessionNumber}`,
    assessmentRevision: snapshot.assessmentRevision ?? 0,
    scaleVersion: "nrs-0-10-v1" as const,
    source: "user" as const,
    recordedAt,
  } satisfies Omit<ScoreRecord, "scoreRecordId" | "supersedesScoreRecordId">;
  output.push({ ...record, scoreRecordId: scoreId(record) });
}

function addConfirmedOrUnselected(
  output: ScoreRecord[],
  snapshot: ScoreRecordSnapshot,
  input: Omit<Parameters<typeof pushScore>[2], "scoreState" | "value"> & { value?: number; confirmed: boolean },
  recordedAt: string,
) {
  pushScore(output, snapshot, { ...input, scoreState: input.confirmed && validScore(input.value) ? "confirmed" : "unselected" }, recordedAt);
}

function assessmentScores(output: ScoreRecord[], snapshot: ScoreRecordSnapshot, assessmentId: string, record: ScoreAssessmentRecord, recordedAt: string) {
  const { actionId, directionId } = actionAndDirection(assessmentId);
  const side = assessmentSide(snapshot);
  if (record.symptomScore !== undefined) {
    addConfirmedOrUnselected(output, snapshot, { stage: "assessment", context: `assessment:${assessmentId}:symptom`, actionId, directionId, side, value: record.symptomScore, confirmed: validScore(record.symptomScore) }, recordedAt);
  }
  if (record.passiveSymptomScore !== undefined) {
    addConfirmedOrUnselected(output, snapshot, { stage: "assessment", context: `assessment:${assessmentId}:passive-symptom`, actionId, directionId, side, value: record.passiveSymptomScore, confirmed: validScore(record.passiveSymptomScore) }, recordedAt);
  }
  if (record.pairedStrengthScore !== undefined) {
    addConfirmedOrUnselected(output, snapshot, { stage: "assessment", context: `assessment:${assessmentId}:paired-strength`, actionId, directionId, side, value: record.pairedStrengthScore, confirmed: validScore(record.pairedStrengthScore) }, recordedAt);
  }
}

function mapScoreEntries(
  output: ScoreRecord[],
  snapshot: ScoreRecordSnapshot,
  values: Record<string, number> | undefined,
  confirmed: Record<string, boolean> | undefined,
  stage: ScoreStage,
  contextPrefix: string,
  recordedAt: string,
) {
  for (const [directionId, value] of Object.entries(values ?? {})) {
    const { actionId } = actionAndDirection(directionId);
    addConfirmedOrUnselected(output, snapshot, {
      stage,
      context: `${contextPrefix}:${directionId}`,
      actionId,
      directionId,
      side: assessmentSide(snapshot),
      value,
      confirmed: confirmed?.[directionId] === true && validScore(value),
    }, recordedAt);
  }
}

/**
 * Build the canonical score projection for the current saved snapshot.
 * The UI can continue to use numbers for interaction; persistence receives
 * records with identity, context and an explicit selected/unselected state.
 */
export function buildScoreRecordsFromSnapshot(snapshot: ScoreRecordSnapshot, recordedAt = new Date().toISOString()): ScoreRecord[] {
  const output: ScoreRecord[] = [];
  const baselineConfirmed = snapshot.intake.baselineScoreConfirmed === true && validScore(snapshot.intake.baselineScore);
  addConfirmedOrUnselected(output, snapshot, {
    stage: "intake",
    context: "intake:baseline",
    actionId: snapshot.intake.customAction || snapshot.intake.reproduction || undefined,
    side: assessmentSide(snapshot),
    value: snapshot.intake.baselineScore,
    confirmed: baselineConfirmed,
  }, recordedAt);

  for (const [assessmentId, record] of Object.entries(snapshot.assessmentResults ?? {})) {
    assessmentScores(output, snapshot, assessmentId, record, recordedAt);
  }

  if (snapshot.postScoreConfirmed || snapshot.postDiscomfort) {
    addConfirmedOrUnselected(output, snapshot, { stage: "treatment-retest", context: "treatment-retest:chief", side: assessmentSide(snapshot), value: snapshot.postScore, confirmed: snapshot.postScoreConfirmed === true && validScore(snapshot.postScore) }, recordedAt);
  }
  mapScoreEntries(output, snapshot, snapshot.movementScores, snapshot.movementScoreConfirmed, "treatment-retest", "treatment-retest:direction", recordedAt);
  if (snapshot.treatmentFinalRetestConfirmed || snapshot.treatmentFinalRetestScore !== undefined) {
    addConfirmedOrUnselected(output, snapshot, { stage: "treatment-retest", context: "treatment-retest:final-chief", side: assessmentSide(snapshot), value: snapshot.treatmentFinalRetestScore, confirmed: snapshot.treatmentFinalRetestConfirmed === true && validScore(snapshot.treatmentFinalRetestScore) }, recordedAt);
  }
  if (snapshot.finalRetestConfirmed || snapshot.finalRetestScore !== undefined) {
    addConfirmedOrUnselected(output, snapshot, { stage: "training-retest", context: "training-retest:final-chief", side: assessmentSide(snapshot), value: snapshot.finalRetestScore, confirmed: snapshot.finalRetestConfirmed === true && validScore(snapshot.finalRetestScore) }, recordedAt);
  }

  if (snapshot.followupScoreConfirmed || snapshot.followupScore > 0) {
    addConfirmedOrUnselected(output, snapshot, { stage: "followup", context: "followup:baseline", side: assessmentSide(snapshot), value: snapshot.followupScore, confirmed: snapshot.followupScoreConfirmed === true && validScore(snapshot.followupScore) }, recordedAt);
  }
  if (snapshot.followupPostScoreConfirmed || snapshot.followupPostDiscomfort) {
    addConfirmedOrUnselected(output, snapshot, { stage: "followup", context: "followup:treatment-retest:chief", side: assessmentSide(snapshot), value: snapshot.followupPostScore, confirmed: snapshot.followupPostScoreConfirmed === true && validScore(snapshot.followupPostScore) }, recordedAt);
  }
  mapScoreEntries(output, snapshot, snapshot.followupMovementScores, snapshot.followupMovementScoreConfirmed, "followup", "followup:direction", recordedAt);
  if (snapshot.followupFinalScoreConfirmed || snapshot.followupFinalScore !== undefined) {
    addConfirmedOrUnselected(output, snapshot, { stage: "followup", context: "followup:final-chief", side: assessmentSide(snapshot), value: snapshot.followupFinalScore, confirmed: snapshot.followupFinalScoreConfirmed === true && validScore(snapshot.followupFinalScore) }, recordedAt);
  }
  return output;
}

/** Merge a new projection without overwriting a prior value in the same context. */
export function mergeScoreRecords(previous: ScoreRecord[], current: ScoreRecord[]): ScoreRecord[] {
  const merged = [...previous];
  for (const next of current) {
    const sameId = merged.findIndex((entry) => entry.scoreRecordId === next.scoreRecordId);
    if (sameId >= 0) {
      merged[sameId] = next;
      continue;
    }
    const priorIndex = merged.findIndex((entry) => sampleKey(entry) === sampleKey(next) && entry.scoreState === "confirmed");
    if (priorIndex >= 0 && merged[priorIndex].value === next.value && next.scoreState === "confirmed") continue;
    const prior = priorIndex >= 0 ? merged[priorIndex] : undefined;
    if (prior && prior.scoreState !== "superseded" && prior.value !== next.value) {
      merged[priorIndex] = { ...prior, scoreState: "superseded", supersedesScoreRecordId: next.scoreRecordId };
      merged.push({ ...next, supersedesScoreRecordId: prior.scoreRecordId });
    } else {
      merged.push(next);
    }
  }
  return merged;
}

/**
 * Compare only records from the same clinical context. A lower number is not
 * a trend when the action, side, stage or scale is different.
 */
export function isComparableScorePair(before: ScoreRecordPair, after: ScoreRecordPair): boolean {
  return before.scoreState === "confirmed"
    && after.scoreState === "confirmed"
    && validScore(before.value)
    && validScore(after.value)
    && before.caseId === after.caseId
    && before.problemThreadId === after.problemThreadId
    && before.actionId === after.actionId
    && before.directionId === after.directionId
    && before.side === after.side
    && before.stage === after.stage
    && before.context === after.context
    && before.scaleVersion === after.scaleVersion;
}
