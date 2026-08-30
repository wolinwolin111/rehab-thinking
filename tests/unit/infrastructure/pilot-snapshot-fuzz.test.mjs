// 快照校验器模糊矩阵（批次 2，v3 干净切换后更新）。
// 合同（SCHEMA-01/REL-01/DATA-05 防回潮）：
// 1. 任意畸形输入不得使 validatePilotSnapshotV3 抛异常——只允许返回 ok/reason；
// 2. 返回 ok 的快照必须能再次通过校验（接受结果自洽、可入库）；
// 3. 同一输入两次调用结果一致（确定性）；
// 4. 循环引用与超深嵌套不得导致栈溢出或挂起。
import assert from "node:assert/strict";
import test from "node:test";
import { loadTypeScriptModule } from "../../support/load-typescript-module.mjs";
import { completePilotSnapshot } from "../../integration/sqlite-api/support.mjs";

const { validatePilotSnapshotV3 } = await loadTypeScriptModule(
  "./src/infrastructure/pilot/persistence/snapshot-schema.ts",
);
const { PILOT_SNAPSHOT_SCHEMA_VERSION } = await loadTypeScriptModule(
  "./src/infrastructure/pilot/api/case-contracts.ts",
);

function rng(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}
function pick(random, values) {
  return values[Math.floor(random() * values.length)];
}

const base = completePilotSnapshot();
const BASE_OK = validatePilotSnapshotV3(structuredClone(base));
assert.equal(BASE_OK.ok, true, `种子快照必须本身合法，reason=${BASE_OK.ok ? "" : BASE_OK.reason}`);

// 收集种子对象的所有路径（深度 ≤5），供变异定位。
const paths = [];
(function walk(node, prefix, depth) {
  if (depth > 5 || node === null || typeof node !== "object") return;
  for (const [key, value] of Object.entries(node)) {
    const p = `${prefix}.${key}`;
    paths.push(p);
    walk(value, p, depth + 1);
  }
})(base, "", 0);
assert.ok(paths.length > 20, "种子路径采集过少，检查夹具");

function writePath(root, p, value) {
  const keys = p.split(".");
  const last = keys.pop();
  const parent = keys.reduce((node, key) => node?.[key], root);
  if (parent && typeof parent === "object") parent[last] = value;
}

const WRONG_VALUES = [
  null,
  42,
  -1,
  "corrupted",
  [],
  {},
  Number.NaN,
  { broken: true },
];

function mutateOnce(random, root) {
  const mode = Math.floor(random() * 8);
  if (mode === 0) {
    // 字段类型翻转/垃圾值
    writePath(root, pick(random, paths), pick(random, WRONG_VALUES));
    return;
  }
  if (mode === 1) {
    // 删除字段
    const p = pick(random, paths);
    const keys = p.split(".");
    const last = keys.pop();
    const parent = keys.reduce((node, key) => node?.[key], root);
    if (parent && typeof parent === "object") delete parent[last];
    return;
  }
  if (mode === 2) {
    // 分数越界
    writePath(root, pick(random, paths), pick(random, [-1, 11, 10.5, Number.MAX_VALUE]));
    return;
  }
  if (mode === 3) {
    // schema 版本漂移
    root.schemaVersion = pick(random, [0, -3, "v999", null, 999999]);
    return;
  }
  if (mode === 4) {
    // 整体替换为原始类型/数组
    return "primitive";
  }
  if (mode === 5) {
    // 循环引用
    writePath(root, pick(random, paths), root);
    return;
  }
  if (mode === 6) {
    // 超深嵌套
    let node = root;
    while (node && typeof node === "object" && Object.keys(node).length) node = node[Object.keys(node)[0]];
    if (typeof node === "object" && node !== null) node.deep = { deep: { deep: { deep: { deep: { deep: { deep: {} } } } } } };
    return;
  }
  // mode 7：revision 倒退类负数注入
  writePath(root, pick(random, paths), -7);
}

test("模糊矩阵：3000 组畸形快照不抛异常、结果形状稳定且接受结果自洽", () => {
  for (let seed = 1; seed <= 3000; seed += 1) {
    const random = rng(seed);
    const mutant = structuredClone(base);
    let wholeReplace = false;
    const rounds = 1 + Math.floor(random() * 3);
    for (let r = 0; r < rounds; r += 1) {
      if (mutateOnce(random, mutant) === "primitive") wholeReplace = true;
    }
    const input = wholeReplace ? pick(random, [null, 7, "x", [], true]) : mutant;

    let first;
    assert.doesNotThrow(() => {
      first = validatePilotSnapshotV3(input);
    }, `seed=${seed} 校验器抛出异常而非返回结构化拒绝`);

    assert.equal(typeof first.ok, "boolean", `seed=${seed} 缺少布尔 ok`);
    if (first.ok === false) {
      assert.equal(typeof first.reason, "string", `seed=${seed} 拒绝时缺少 reason`);
      assert.ok(first.reason.length > 0, `seed=${seed} reason 为空`);
    } else {
      assert.ok(first.snapshot && typeof first.snapshot === "object", `seed=${seed} 接受时缺少快照对象`);
      // REL-01 语义 oracle：被接受的快照必须携带当前 schema 版本（防"全放行"式退化）。
      assert.equal(
        first.snapshot.schemaVersion,
        PILOT_SNAPSHOT_SCHEMA_VERSION,
        `seed=${seed} 接受的快照 schemaVersion 不是当前版本`,
      );
      const second = validatePilotSnapshotV3(first.snapshot);
      assert.equal(second.ok, true, `seed=${seed} 接受的快照无法再次通过校验：${second.reason}`);
    }

    const repeat = validatePilotSnapshotV3(structuredClone(input));
    assert.equal(repeat.ok, first.ok, `seed=${seed} 同一输入两次判定不一致`);
  }
});

test("循环引用与超深嵌套专项：不栈溢出且有确定结论", () => {
  for (const [name, build] of [
    ["self-cycle", () => {
      const s = structuredClone(base);
      s.self = s;
      return s;
    }],
    ["mutual-cycle", () => {
      const s = structuredClone(base);
      const a = {}; const b = { back: a };
      a.forward = b;
      s.tangle = a;
      return s;
    }],
    ["deep-256", () => {
      const s = structuredClone(base);
      let node = s;
      for (let i = 0; i < 256; i += 1) node.child = { parentFlag: i, ...{} , get next() { return node.child; } };
      node.child = {};
      let walker = node;
      for (let i = 0; i < 256; i += 1) { walker.child = {}; walker = walker.child; }
      return s;
    }],
  ]) {
    let result;
    assert.doesNotThrow(() => {
      result = validatePilotSnapshotV3(build());
    }, `${name} 导致异常`);
    assert.equal(typeof result?.ok, "boolean", `${name} 未返回结构化结论`);
  }
});
