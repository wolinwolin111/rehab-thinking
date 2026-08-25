import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("context tips are dismissible, remembered, and do not replace safety messages", async () => {
  const [hint, workbench, treatment, records] = await Promise.all([
    read("../../src/features/rehabmind/components/shared/once-hint.tsx"),
    read("../../src/features/rehabmind/components/workbench/rehabmind-workbench.tsx"),
    read("../../src/features/rehabmind/components/stages/treatment-retest-stage.tsx"),
    read("../../src/features/rehabmind/components/records/rehab-records-page.tsx"),
  ]);

  assert.match(hint, /rehabmind-once-hint:/);
  assert.match(hint, /localStorage\.getItem/);
  assert.match(hint, /localStorage\.setItem/);
  assert.match(hint, /aria-label="关闭提示"/);
  assert.match(workbench, /反馈问题时，可以把案例编号告诉我们。/);
  assert.match(workbench, /已保存，下次打开可以从这里继续。/);
  assert.match(records, /这里可以查看以前的恢复情况。/);
  assert.match(treatment, /再试一次刚才的动作，看看现在有没有变化。/);
  assert.match(workbench, /修改后，受影响的后续内容需要重新确认。是否继续修改？/);
  assert.match(workbench, /active=\{!testContext/);
});
