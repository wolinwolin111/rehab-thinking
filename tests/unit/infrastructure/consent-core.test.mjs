import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../../../src/infrastructure/pilot/consent/consent-core.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const consent = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

function fakeStorage(initial = new Map()) {
  const map = initial;
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, value),
  };
}

test("PRIV-01: consent round-trips with version and timestamp", () => {
  const storage = fakeStorage();
  assert.equal(consent.readPilotConsent(storage), null);

  const record = consent.buildPilotConsentRecord("2026-08-22T08:00:00.000Z");
  assert.equal(record.version, "pilot-consent-v1");
  consent.writePilotConsent(storage, record);

  const loaded = consent.readPilotConsent(storage);
  assert.deepEqual(loaded, { version: "pilot-consent-v1", confirmedAt: "2026-08-22T08:00:00.000Z" });
});

test("corrupted or malformed stored consent reads as absent instead of throwing", () => {
  const broken = fakeStorage(new Map([["rehabmind-pilot-consent", "{not-json"]]));
  assert.equal(consent.readPilotConsent(broken), null);

  const wrongShape = fakeStorage(new Map([["rehabmind-pilot-consent", JSON.stringify({ version: 3 })]]));
  assert.equal(consent.readPilotConsent(wrongShape), null);
});

test("attaching consent to a v3 snapshot embeds it in domain.consent without mutating the original", () => {
  const snapshot = { schemaVersion: 3, contractRevision: 3, domain: { intake: { description: "右膝下楼刺痛" } } };
  const record = { version: "pilot-consent-v1", confirmedAt: "2026-08-22T09:30:00.000Z" };
  const attached = consent.attachPilotConsent(snapshot, record);
  assert.deepEqual(attached.domain.consent, record);
  assert.equal(attached.domain.intake, snapshot.domain.intake);
  assert.equal("consent" in snapshot, false);
  assert.equal("consent" in snapshot.domain, false);
});
