import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [activate, release, recovery, verify] = await Promise.all([
  readFile(new URL("../../../scripts/deploy/vps-activate-release.sh", import.meta.url), "utf8"),
  readFile(new URL("../../../scripts/deploy/vps-release.sh", import.meta.url), "utf8"),
  readFile(new URL("../../../scripts/deploy/vps-verify-recovery.sh", import.meta.url), "utf8"),
  readFile(new URL("../../../scripts/deploy/vps-verify-release.sh", import.meta.url), "utf8"),
]);

test("A7 REL-04: release and rollback use the same PM2 activation boundary", () => {
  assert.match(release, /vps-activate-release\.sh/);
  assert.match(recovery, /vps-activate-release\.sh/);
  assert.doesNotMatch(release, /pm2 startOrReload/);
  assert.doesNotMatch(recovery, /pm2 startOrReload/);
});

test("A7 REL-04: activation and health checks prove the process runs from current release", () => {
  assert.match(activate, /pm2 delete rehabmind/);
  assert.match(activate, /\/proc\/\$PID\/cwd/);
  assert.match(verify, /\/proc\/\$PM2_PID\/cwd/);
  assert.match(release, /refusing to prune while PM2 cwd is not the new release/);
});

test("A7 DEPLOY-02: release cannot succeed on page status alone", () => {
  assert.match(release, /vps-verify-release\.sh/);
  assert.match(verify, /check-deployed-assets\.mjs/);
});

test("APP-DEPLOY-01: canary enforces source and consent without restoring the retired invite gate", () => {
  assert.match(release, /CANARY_BOUNDARY/);
  assert.match(release, /source\/consent boundary failed/);
  assert.match(release, /CANARY_BOUNDARY" = "400"/);
  assert.doesNotMatch(release, /invite gate|CANARY_GATE|CANARY_GATE" = "403"/);
  assert.match(release, /sed -i '\/\^PILOT_INVITE_\/d'/);
  assert.match(release, /PILOT_TRUSTED_PROXY=nginx/);
});

test("APP-DEPLOY-02: canary cannot reuse an occupied port or leave an orphan process", () => {
  assert.match(release, /canary port already in use/);
  assert.match(release, /setsid node/);
  assert.match(release, /kill -0 "\$CANARY_PID"/);
  assert.match(release, /kill -TERM -- "-\$CANARY_PID"/);
});
