import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the complete RehabMind workflow", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>RehabMind｜教练康复思路助手<\/title>/i);
  assert.match(html, /症状信息收集/);
  assert.match(html, /先确认/);
  assert.match(html, /<span>检查<\/span>/);
  assert.match(html, /<span>处理<\/span>/);
  assert.match(html, /<span>训练复查<\/span>/);
  assert.match(html, /也可以输入系统里没有的情况/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/i);
});

test("ships a gated custom-input workflow and record-derived response rules", async () => {
  const [library, system, rules] = await Promise.all([
    readFile(new URL("../app/rehab-library.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/rehab-system.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/direction-rules.ts", import.meta.url), "utf8"),
  ]);
  for (const name of ["颈部", "肩关节", "肘关节", "腕与手", "胸椎与肋骨", "腰部", "髋与大腿", "膝关节", "踝关节", "足部与足趾"]) {
    assert.match(library, new RegExp(name));
  }
  for (const phrase of ["groups", "reps", "每组", "mobilization", "softTissue", "return:"]) {
    assert.match(library, new RegExp(phrase));
  }
  assert.doesNotMatch(library, /standardDose|gentleDose|起始剂量/);
  assert.match(system, /disabled=\{index > maxUnlocked\}/);
  assert.match(system, /不符合，按自定义症状继续/);
  assert.match(system, /makeCustomPattern/);
  assert.match(system, /特殊检查/);
  assert.match(system, /视频演示 · 后续上传/);
  assert.match(system, /不要求当场消失/);
  assert.match(system, /不做当场反复测试/);
  assert.match(system, /记录已保存到当前设备/);
  for (const phrase of ["股外侧肌、阔筋膜张肌与髂胫束周围", "腘肌", "腓肠肌与比目鱼肌", "膝关节伸直方向松动", "腓骨近端松动", "终末伸膝"]) {
    assert.match(rules, new RegExp(phrase));
  }
  assert.match(rules, /只保留能让伸直角度或站立伸膝马上改善/);
});
