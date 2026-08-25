import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function loadBundle(paths) {
  const parts = [];
  for (let i = 0; i < paths.length; i++) {
    const src = await readFile(new URL(paths[i], import.meta.url), "utf8");
    let out = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
    out = out.replace(/import\s*\{[^}]*\}\s*from\s*"[^"]*";?/g, "");
    if (i < paths.length - 1) out = out.replace(/export\s+/g, "");
    parts.push(out);
  }
  return import(`data:text/javascript;base64,${Buffer.from(parts.join("\n")).toString("base64")}`);
}

const core = await loadBundle([
  "../../../src/domain/rehab/intake/chief-action-core.ts",
  "../../../src/domain/rehab/treatment/candidate-order-core.ts",
  "../../../src/domain/rehab/treatment/candidate-scoring-core.ts",
]);

const calfCandidate = { id: "muscle:calf-release", title: "小腿后侧轻柔松解", siteLabel: "小腿后侧", targetLabel: "", tags: ["calf", "release"] };
const intake = { side: "右侧", location: "小腿后侧", symptomType: "酸痛", reportedActions: [{ raw: "提踵" }] };

test("location match boosts candidate relevance", () => {
  const withLocation = core.candidateRelevance(calfCandidate, intake, new Set(["calf"]));
  const withoutLocation = core.candidateRelevance(calfCandidate, { ...intake, location: "大腿前侧" }, new Set(["calf"]));
  assert.ok(withLocation > withoutLocation);
});

test("support tag match contributes to score", () => {
  const tagged = core.candidateRelevance(calfCandidate, intake, new Set(["calf"]));
  const untagged = core.candidateRelevance(calfCandidate, intake, new Set());
  assert.ok(tagged > untagged);
});
