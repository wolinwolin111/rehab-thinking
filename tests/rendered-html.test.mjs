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
  assert.match(html, /评估检查/);
  assert.match(html, /处理与复测/);
  assert.match(html, /训练与复查/);
  assert.match(html, /10个区域/);
  assert.match(html, /外侧踝扭伤/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/i);
});

test("ships a broad joint library and plain-language training instructions", async () => {
  const [library, system] = await Promise.all([
    readFile(new URL("../app/rehab-library.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/rehab-system.tsx", import.meta.url), "utf8"),
  ]);
  for (const name of ["颈部", "肩关节", "肘关节", "腕与手", "胸椎与肋骨", "腰部", "髋与大腿", "膝关节", "踝关节", "足部与足趾"]) {
    assert.match(library, new RegExp(name));
  }
  for (const phrase of ["groups", "reps", "每组", "mobilization", "softTissue", "return:"]) {
    assert.match(library, new RegExp(phrase));
  }
  assert.doesNotMatch(library, /standardDose|gentleDose|起始剂量/);
  assert.match(system, /视频位置已保留/);
  assert.match(system, /特殊检查/);
  assert.match(system, /后续可直接上传自有拍摄视频/);
  assert.match(system, /不要求当场消失/);
  assert.match(system, /不追求当场力量变化/);
  assert.match(system, /由受训人员尝试关节松动/);
  assert.match(system, /本次记录已保存在当前设备/);
});
