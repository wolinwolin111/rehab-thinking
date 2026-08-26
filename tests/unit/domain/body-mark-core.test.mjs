import assert from "node:assert/strict";
import test from "node:test";
import { loadTypeScriptModule } from "../../support/load-typescript-module.mjs";

const bodyMark = await loadTypeScriptModule("./src/domain/rehab/records/body-mark-core.ts");

const base = {
  caseId: "case-1",
  problemThreadId: "thread-1",
  sessionId: "session-1",
  createdAt: "2026-08-27T00:00:00.000Z",
  symptomKind: "tenderness",
};

test("RMD-MARK-01: marks preserve independent side, region, view and stable selection identity", () => {
  const marks = bodyMark.bodyMarksFromSelections({
    ...base,
    confirmed: true,
    selections: [
      { id: "left-knee-front", side: "左侧", areaId: "knee", areaLabel: "膝", location: "髌骨内侧", regionId: "knee", view: "front" },
      { id: "right-knee-medial", side: "右侧", areaId: "knee", areaLabel: "膝", location: "关节线", regionId: "knee", view: "medial" },
    ],
  });
  assert.equal(marks.length, 2);
  assert.deepEqual(marks.map((mark) => ({
    markId: mark.markId,
    side: mark.side,
    regionId: mark.regionId,
    surface: mark.surface,
    status: mark.status,
    coordinateCompleteness: mark.coordinateCompleteness,
  })), [
    {
      markId: "session-1:mark:tenderness:left-knee-front",
      side: "left",
      regionId: "knee",
      surface: "front",
      status: "confirmed",
      coordinateCompleteness: "zone-only",
    },
    {
      markId: "session-1:mark:tenderness:right-knee-medial",
      side: "right",
      regionId: "knee",
      surface: "medial",
      status: "confirmed",
      coordinateCompleteness: "zone-only",
    },
  ]);
  assert.ok(marks.every((mark) => mark.caseId === "case-1" && mark.problemThreadId === "thread-1" && mark.sessionId === "session-1"));
  assert.ok(marks.every((mark) => mark.confirmedAt === base.createdAt));
});

test("RMD-MARK-01: suggested marks and foot views retain their source semantics", () => {
  const marks = bodyMark.bodyMarksFromSelections({
    ...base,
    symptomKind: "swelling",
    source: "parser-suggestion",
    confirmed: false,
    selections: [
      { id: "left-foot-front", side: "左侧", areaId: "foot", areaLabel: "足背", location: "足背", regionId: "ankle-foot", view: "front" },
      { id: "left-foot-back", side: "左侧", areaId: "foot", areaLabel: "足底", location: "足底", regionId: "ankle-foot", view: "back" },
    ],
  });
  assert.deepEqual(marks.map((mark) => ({ surface: mark.surface, source: mark.source, status: mark.status, confirmedAt: mark.confirmedAt })), [
    { surface: "dorsal", source: "parser-suggestion", status: "suggested", confirmedAt: undefined },
    { surface: "plantar", source: "parser-suggestion", status: "suggested", confirmedAt: undefined },
  ]);
});
