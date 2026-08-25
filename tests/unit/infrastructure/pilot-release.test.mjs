import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { loadTypeScriptModule } from "../../support/load-typescript-module.mjs";

const release = await loadTypeScriptModule("./src/infrastructure/pilot/release/release-version.ts");
const packageMetadata = JSON.parse(await readFile(new URL("../../../package.json", import.meta.url), "utf8"));

test("A5 REL-03: one generated manifest binds package, build, commit, rule, and schema identities", () => {
  const manifest = release.PILOT_RELEASE_MANIFEST;
  assert.equal(manifest.packageVersion, packageMetadata.version);
  assert.match(manifest.commitSha, /^(?:[a-f\d]{40}|workspace)$/);
  assert.ok(manifest.buildId);
  assert.equal(manifest.ruleVersion, manifest.decisionVersion);
  assert.equal(manifest.schemaVersion, 1);
  assert.match(manifest.appVersion, new RegExp(`^rehabmind-pilot-app-${packageMetadata.version.replaceAll(".", "\\.")}\\+`));
  assert.deepEqual(release.PILOT_RELEASE_VERSIONS, {
    appVersion: manifest.appVersion,
    knowledgeVersion: manifest.knowledgeVersion,
    decisionVersion: manifest.decisionVersion,
  });
});
