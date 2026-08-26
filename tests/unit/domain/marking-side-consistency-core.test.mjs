import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../../../src/domain/rehab/shared/marking-side-consistency-core.ts", import.meta.url), "utf8");
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const core = await import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);

test("标记与主诉同侧时不产生提示", () => {
  assert.equal(core.markingSideMismatchHint({ complaintSide: "左侧", markedSides: ["左侧"] }), null);
});

test("标记在主诉对侧时产生温和确认提示", () => {
  const hint = core.markingSideMismatchHint({ complaintSide: "左侧", markedSides: ["右侧"] });
  assert.ok(hint);
  assert.equal(hint, "肿胀位置在右侧，与主诉左侧不同，如无误点请继续");
});

test("混合侧别标记只提示与主诉不同的那一侧", () => {
  const hint = core.markingSideMismatchHint({ complaintSide: "右侧", markedSides: ["右侧", "左侧", "右侧"] });
  assert.ok(hint);
  assert.equal(hint, "肿胀位置在左侧，与主诉右侧不同，如无误点请继续");
});

test("双侧或中间主诉不产生提示（两侧都属正常范围）", () => {
  assert.equal(core.markingSideMismatchHint({ complaintSide: "双侧/中间", markedSides: ["左侧", "右侧"] }), null);
  assert.equal(core.markingSideMismatchHint({ complaintSide: "", markedSides: ["左侧"] }), null);
});

test("没有标记或标记缺侧别时不产生提示", () => {
  assert.equal(core.markingSideMismatchHint({ complaintSide: "左侧", markedSides: [] }), null);
  assert.equal(core.markingSideMismatchHint({ complaintSide: "左侧", markedSides: ["双侧/中间", ""] }), null);
});

test("提示名词可替换以覆盖其他标记类型", () => {
  const hint = core.markingSideMismatchHint({ complaintSide: "右侧", markedSides: ["左侧"], noun: "按压痛位置" });
  assert.ok(hint);
  assert.equal(hint, "按压痛位置在左侧，与主诉右侧不同，如无误点请继续");
});

test("M-05：清理入口只移除与主诉不同侧的标记", () => {
  const marks = [{ side: "右侧", label: "A" }, { side: "左侧", label: "B" }, { side: "双侧/中间", label: "C" }, { label: "D" }];
  const kept = core.removeMarksConflictingWithComplaintSide("左侧", marks);
  assert.deepEqual(kept, [{ side: "左侧", label: "B" }, { side: "双侧/中间", label: "C" }, { label: "D" }]);
});

test("M-05：双侧主诉或缺省侧别不清理任何标记，输入数组不被修改", () => {
  const marks = [{ side: "左侧" }, { side: "右侧" }];
  assert.equal(core.removeMarksConflictingWithComplaintSide("双侧/中间", marks).length, 2);
  assert.equal(core.removeMarksConflictingWithComplaintSide("", marks).length, 2);
  assert.equal(marks.length, 2);
});
