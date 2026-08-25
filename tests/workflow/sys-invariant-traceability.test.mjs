// SYS 追溯完整性门禁（批次 4）：
// 1. 文档侧唯一来源 docs/pilot-scenario-coverage.md 中出现的每个 SYS-* 编号，
//    必须在本目录 sys-invariant-traceability.json 有守护映射（防孤儿不变量）；
// 2. JSON 中每个守护文件必须存在，且文件内容包含 anchor（证明守护关系真实成立）；
// 3. JSON 中不得出现文档已删除的僵尸编号。
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const DOC = new URL("../../docs/pilot-scenario-coverage.md", import.meta.url);
const MAP = new URL("./sys-invariant-traceability.json", import.meta.url);

const docText = await readFile(DOC, "utf8");
const map = JSON.parse(await readFile(MAP, "utf8"));

const documentedIds = [...new Set(docText.match(/SYS-[A-Z]+(?:-[A-Z]+)*-?\d{2,3}/g) || [])].sort();
const mappedIds = [
  ...new Set([...Object.keys(map.invariants), ...Object.keys(map.scenarios)]),
].sort();

test("文档中每个 SYS-* 编号都有守护测试映射（无孤儿不变量/场景）", () => {
  const orphans = documentedIds.filter((id) => !mappedIds.includes(id));
  assert.deepEqual(orphans, [], `以下编号在验收文档中出现但缺少守护映射：${orphans.join(", ")}`);
});

test("追溯清单中没有文档已删除的僵尸编号", () => {
  const zombies = mappedIds.filter((id) => !documentedIds.includes(id));
  assert.deepEqual(zombies, [], `以下编号已不在验收文档中，应从清单删除：${zombies.join(", ")}`);
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
