export type BodyMarkSymptomKind = "complaint" | "swelling" | "bruise" | "tenderness" | "sensory";
export type BodyMarkSide = "left" | "right" | "midline" | "bilateral";
export type BodyMarkSurface = "front" | "back" | "medial" | "lateral" | "dorsal" | "plantar";
export type BodyMarkSource = "user" | "parser-suggestion" | "legacy-migrated";
export type BodyMarkStatus = "suggested" | "confirmed" | "invalidated";

export type BodyMark = {
  markId: string;
  caseId: string;
  problemThreadId: string;
  sessionId: string;
  symptomKind: BodyMarkSymptomKind;
  side: BodyMarkSide;
  regionId: string;
  areaId: string;
  surface: BodyMarkSurface;
  xNormalized?: number;
  yNormalized?: number;
  zoneId?: string;
  humanLabel: string;
  source: BodyMarkSource;
  status: BodyMarkStatus;
  createdAt: string;
  confirmedAt?: string;
  invalidatedAt?: string;
  invalidatedByMarkId?: string;
  /** 没有真实点击坐标时明确标记为区域级，不伪造坐标。 */
  coordinateCompleteness: "point" | "zone-only";
};

type BodyMarkSelection = {
  id: string;
  side: string;
  areaId: string;
  areaLabel: string;
  location: string;
  regionId: string;
  view: "front" | "back" | "medial" | "lateral";
};

function sideOf(value: string): BodyMarkSide {
  if (value === "左侧") return "left";
  if (value === "右侧") return "right";
  return value === "双侧/中间" ? "bilateral" : "midline";
}

function surfaceOf(view: BodyMarkSelection["view"], areaId: string): BodyMarkSurface {
  if (areaId === "foot" && view === "front") return "dorsal";
  if (areaId === "foot" && view === "back") return "plantar";
  return view;
}

export function bodyMarksFromSelections(input: {
  caseId: string;
  problemThreadId: string;
  sessionId: string;
  createdAt: string;
  symptomKind: BodyMarkSymptomKind;
  selections: readonly BodyMarkSelection[];
  confirmed: boolean;
  source?: BodyMarkSource;
}): BodyMark[] {
  return input.selections.map((selection) => ({
    markId: `${input.sessionId}:mark:${input.symptomKind}:${selection.id}`,
    caseId: input.caseId,
    problemThreadId: input.problemThreadId,
    sessionId: input.sessionId,
    symptomKind: input.symptomKind,
    side: sideOf(selection.side),
    regionId: selection.regionId,
    areaId: selection.areaId,
    surface: surfaceOf(selection.view, selection.areaId),
    zoneId: selection.id,
    humanLabel: `${selection.side}·${selection.areaLabel}·${selection.location}`,
    source: input.source ?? "user",
    status: input.confirmed ? "confirmed" : "suggested",
    createdAt: input.createdAt,
    ...(input.confirmed ? { confirmedAt: input.createdAt } : {}),
    coordinateCompleteness: "zone-only",
  }));
}

/** Keep removed marks as history instead of silently deleting them from the snapshot. */
export function mergeBodyMarks(previous: BodyMark[], current: BodyMark[], invalidatedAt = new Date().toISOString(), currentSessionId = current[0]?.sessionId): BodyMark[] {
  const currentIds = new Set(current.map((mark) => mark.markId));
  const merged = previous.map((mark) => {
    if (mark.status === "invalidated" || (currentSessionId && mark.sessionId !== currentSessionId) || currentIds.has(mark.markId)) return mark;
    return { ...mark, status: "invalidated" as const, invalidatedAt };
  });
  for (const mark of current) {
    const previousMark = previous.find((entry) => entry.markId === mark.markId);
    if (!previousMark) {
      merged.push(mark);
    } else if (previousMark.status !== "invalidated") {
      const index = merged.findIndex((entry) => entry.markId === mark.markId);
      if (index >= 0) merged[index] = mark;
    } else {
      // Re-adding a removed location is a new mark; the invalidated version remains auditable.
      merged.push({ ...mark, markId: `${mark.markId}:rev:${invalidatedAt}` });
    }
  }
  return merged;
}
