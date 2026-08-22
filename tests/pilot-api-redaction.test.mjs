import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../app/api/pilot/_shared.ts", import.meta.url), "utf8");

test("pilot API storage logs keep only sanitized error metadata", () => {
  assert.match(source, /console\.error\(\s*"pilot API storage failure"/);
  assert.match(source, /error instanceof Error \? \{ name: error\.name, message: error\.message \} : "unknown"/);
  assert.doesNotMatch(source, /console\.error\([\s\S]{0,300}(?:request|headers|body|payload|accessToken|inviteToken)/);
});

test("pilot API error responses use generic messages for auth and storage failures", () => {
  assert.match(source, /Case access denied/);
  assert.match(source, /Case service is temporarily unavailable/);
  assert.doesNotMatch(source, /return Response\.json\(\{ error: error\.message/);
});
