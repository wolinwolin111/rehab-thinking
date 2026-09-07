// SYS 追溯完整性门禁（批次 4；第 32 轮改 B 方案）：
// 编号权威清单＝本目录 sys-invariant-traceability.json（含 guards/anchor）；
// 语义承载见 docs/system/02-decision-framework.md §13（散文，非机器可读源）。
// 门禁保留两项硬检查：① 编号清单非空且唯一；② 每个守护文件存在且含 anchor（守护关系真实）。
// 旧「文档↔JSON 孤儿/僵尸交叉核对」已删——重构后 SYS-* 分散（02 仅散文简写、无 16 场景号），
// 无单一文档承载全清单，该检测前提不成立（owner 第 32 轮裁定 B）。
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const MAP = new URL("./sys-invariant-traceability.json", import.meta.url);
const map = JSON.parse(await readFile(MAP, "utf8"));

const ids = [...Object.keys(map.invariants), ...Object.keys(map.scenarios)];

test("SYS 编号权威清单非空且唯一", () => {
  assert.ok(ids.length >= 30, `SYS 编号应不少于 30，实得 ${ids.length}`);
  assert.equal(new Set(ids).size, ids.length, "SYS 编号不得重复");
});

for (const [id, entry] of Object.entries({ ...map.invariants, ...map.scenarios })) {
  for (const guard of entry.guards) {
    test(`${id} 守护存在：${guard.file} :: ${guard.anchor}`, async () => {
      const fileUrl = new URL(`../../${guard.file}`, import.meta.url);
      await access(fileUrl);
      const content = await readFile(fileUrl, "utf8");
      assert.ok(
        content.includes(guard.anchor),
        `守护文件 ${guard.file} 不包含锚点 ${JSON.stringify(guard.anchor)}，守护关系失效`,
      );
    });
  }
}
