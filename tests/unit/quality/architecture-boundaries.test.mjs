import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { checkArchitectureBoundaries } from "../../../scripts/quality/check-architecture-boundaries.mjs";

const baseConfig = {
  schemaVersion: 1,
  sourceRoot: "src",
  domainRoots: ["src/domain"],
  domainForbiddenPackages: ["react", "react-dom", "next"],
  domainForbiddenProjectRoots: ["app", "db", "src/features", "src/infrastructure"],
  domainForbiddenGlobals: ["fetch", "localStorage", "sessionStorage", "indexedDB", "window", "document", "navigator"],
  stageRoots: ["src/features/rehabmind/components/stages"],
  stageForbiddenPackages: ["drizzle-orm", "better-sqlite3"],
  stageForbiddenProjectRoots: ["app", "db", "src/domain", "src/infrastructure"],
  stageForbiddenGlobals: ["fetch", "localStorage", "sessionStorage", "indexedDB"],
  exclusiveRuleOwners: [],
};

test("A3: the repository alias resolves new modules from @/src", async () => {
  const tsconfig = JSON.parse(await readFile(new URL("../../../tsconfig.json", import.meta.url), "utf8"));
  assert.deepEqual(tsconfig.compilerOptions.paths["@/*"], ["./*"]);
});

test("A3: an intentional domain and stage violation is rejected", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "rehabmind-boundary-invalid-"));
  const domainDir = path.join(root, "src", "domain", "rehab", "shared");
  const stageDir = path.join(root, "src", "features", "rehabmind", "components", "stages");
  await mkdir(domainDir, { recursive: true });
  await mkdir(stageDir, { recursive: true });
  await writeFile(path.join(domainDir, "invalid.ts"), 'import React from "react";\nexport const value = localStorage.getItem("x");\n', "utf8");
  await writeFile(path.join(stageDir, "invalid-stage.tsx"), 'import { value } from "@/src/domain/rehab/shared/invalid";\nexport const Stage = () => value;\n', "utf8");
  const violations = await checkArchitectureBoundaries({ rootDir: root, config: baseConfig });
  assert.ok(violations.some((item) => item.boundary === "domain" && item.code === "forbidden-package-import"));
  assert.ok(violations.some((item) => item.boundary === "domain" && item.detail === "localStorage"));
  assert.ok(violations.some((item) => item.boundary === "stage" && item.code === "forbidden-project-import"));
});

test("A3: a pure domain module and prop-only stage pass", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "rehabmind-boundary-valid-"));
  const domainDir = path.join(root, "src", "domain", "rehab", "shared");
  const stageDir = path.join(root, "src", "features", "rehabmind", "components", "stages");
  await mkdir(domainDir, { recursive: true });
  await mkdir(stageDir, { recursive: true });
  await writeFile(path.join(domainDir, "score.ts"), "export const clampScore = (value: number) => Math.max(0, Math.min(10, value));\n", "utf8");
  await writeFile(path.join(stageDir, "score-stage.tsx"), "export const ScoreStage = ({ score }: { score: number }) => <span>{score}</span>;\n", "utf8");
  assert.deepEqual(await checkArchitectureBoundaries({ rootDir: root, config: baseConfig }), []);
});

test("A3: stage type-only domain imports are exempt, runtime imports are still rejected", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "rehabmind-boundary-type-"));
  const domainDir = path.join(root, "src", "domain", "rehab", "shared");
  const stageDir = path.join(root, "src", "features", "rehabmind", "components", "stages");
  await mkdir(domainDir, { recursive: true });
  await mkdir(stageDir, { recursive: true });
  await writeFile(path.join(domainDir, "obligation.ts"), "export type RetestObligation = { id: string };\nexport const buildObligation = () => ({ id: \"x\" });\n", "utf8");
  await writeFile(path.join(stageDir, "type-only-stage.tsx"), [
    "import type { RetestObligation } from \"@/src/domain/rehab/shared/obligation\";",
    "import { type RetestObligation as Alias } from \"@/src/domain/rehab/shared/obligation\";",
    "export const pick = (obligation: RetestObligation | Alias) => obligation;",
  ].join("\n"), "utf8");
  await writeFile(path.join(stageDir, "runtime-stage.tsx"), [
    "import { buildObligation } from \"@/src/domain/rehab/shared/obligation\";",
    "export const value = buildObligation();",
  ].join("\n"), "utf8");
  await writeFile(path.join(stageDir, "mixed-stage.tsx"), [
    "import { buildObligation, type RetestObligation } from \"@/src/domain/rehab/shared/obligation\";",
    "export const value = buildObligation();",
  ].join("\n"), "utf8");
  const violations = await checkArchitectureBoundaries({ rootDir: root, config: baseConfig });
  assert.ok(violations.some((item) => item.file === "src/features/rehabmind/components/stages/runtime-stage.tsx"));
  assert.ok(violations.some((item) => item.file === "src/features/rehabmind/components/stages/mixed-stage.tsx"));
  assert.equal(violations.some((item) => item.file === "src/features/rehabmind/components/stages/type-only-stage.tsx"), false);
});

test("A4: migrated workflow rules cannot return to the main component", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "rehabmind-boundary-owner-"));
  const appDir = path.join(root, "src", "features", "rehabmind", "components", "workbench");
  const ownerDir = path.join(root, "src", "features", "rehabmind", "workflow");
  await mkdir(appDir, { recursive: true });
  await mkdir(ownerDir, { recursive: true });
  await writeFile(path.join(ownerDir, "workflow-orchestrator.ts"), "export const owner = true;\n", "utf8");
  await writeFile(path.join(appDir, "rehabmind-workbench.tsx"), "const result = resolveTrainingStageGate(input);\n", "utf8");
  const violations = await checkArchitectureBoundaries({
    rootDir: root,
    config: {
      ...baseConfig,
      exclusiveRuleOwners: [{
        ruleId: "ARCH-02-WORKFLOW-OWNER",
        owner: "src/features/rehabmind/workflow/workflow-orchestrator.ts",
        forbiddenFiles: ["src/features/rehabmind/components/workbench/rehabmind-workbench.tsx"],
        symbols: ["resolveTrainingStageGate("],
      }],
    },
  });
  assert.ok(violations.some((item) => item.code === "duplicate-rule-owner"));
});
