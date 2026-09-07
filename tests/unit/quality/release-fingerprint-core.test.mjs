import assert from "node:assert/strict";
import test from "node:test";
import { isReleaseFingerprintExcluded } from "../../../scripts/quality/release-fingerprint-core.mjs";

test("A7 REL-03: runtime and rule inputs remain part of a dirty build identity", () => {
  for (const file of [
    "src/features/rehabmind/components/workbench/rehabmind-workbench.tsx",
    "src/domain/workflow/orchestrate-workflow.ts",
    "docs/system/01-product-design.md",
    "drizzle/0006_admin_audit.sql",
    "drizzle/0007_source_and_consent.sql",
    "drizzle/0008_test_case_isolation.sql",
    "tests/workflow/workflow-command-adapter.test.mjs",
    "scripts/deploy/vps-release.sh",
  ]) assert.equal(isReleaseFingerprintExcluded(file), false, file);
});

test("A7 REL-03: generated identity and post-run status reports do not invalidate their own evidence", () => {
  // 第 32 轮：删除 3 条已归档的死路径样例（HANDOVER/project-status/remediation-plan）。
  // docs/handover/、docs/archive/ 的前缀排除覆盖待 dev Step 2 谓词前缀化后补样例（现谓词按精确集合，加前缀样例此刻会红）。
  for (const file of [
    "src/infrastructure/pilot/release/release.generated.ts",
    "README.md",
    "docs/README.md",
    "docs/quality/rehabmind-quality-remediation-register.md",
    "docs/quality/a7-release-gates-2026-08-24.md",
    "scripts/README.md",
    "tests/README.md",
  ]) assert.equal(isReleaseFingerprintExcluded(file), true, file);
});
