import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const matrix = JSON.parse(await readFile(new URL("./p0-rule-matrix.json", import.meta.url), "utf8"));
const tables = JSON.parse(await readFile(new URL("./decision-tables/p0-gates.json", import.meta.url), "utf8"));

const requiredRules = [
  "CASE-01", "AUDIT-03", "AUDIT-04", "FEED-02", "SCHEMA-01", "SYNC-01",
  "DB-01", "ONBOARD-01", "SEC-02", "REL-03", "TEST-14", "TEST-15", "TEST-16",
  "TEST-17", "TEST-18", "TEST-19",
];
const requiredGates = ["SAFE-GATE", "RETEST-GATE", "QUEUE-GATE", "TRAINING-GATE", "PERMISSION-GATE", "RETURN-EDIT-GATE"];

test("TEST-16: every A1 P0 rule has executable traceability fields", async () => {
  assert.equal(matrix.schemaVersion, 1);
  const ids = matrix.rules.map((rule) => rule.ruleId);
  assert.deepEqual(requiredRules.filter((id) => !ids.includes(id)), []);

  for (const rule of matrix.rules) {
    assert.equal(rule.priority, "P0", `${rule.ruleId} priority`);
    assert.ok(rule.designRule, `${rule.ruleId} design rule`);
    assert.ok(rule.productionEntries.length, `${rule.ruleId} production entry`);
    assert.ok(rule.legalExits.length, `${rule.ruleId} legal exits`);
    assert.ok(rule.forbiddenExits.length, `${rule.ruleId} forbidden exits`);
    assert.ok(rule.stateEffects.length, `${rule.ruleId} state effects`);
    assert.ok(rule.evidence.length, `${rule.ruleId} evidence`);
    for (const item of rule.evidence) {
      await access(item.test);
      assert.ok(["behavior", "wiring"].includes(item.type), `${rule.ruleId} evidence type`);
    }
  }
});

test("TEST-19: all required compound gates have explicit rows and condition-independence methods", () => {
  const ids = tables.tables.map((table) => table.ruleId);
  assert.deepEqual(requiredGates.filter((id) => !ids.includes(id)), []);
  for (const table of tables.tables) {
    assert.ok(["mcdc", "condition-independence"].includes(table.method), `${table.ruleId} method`);
    assert.ok(table.conditions.length >= 3, `${table.ruleId} compound conditions`);
    assert.ok(table.rows.some((row) => table.outcomes.includes(row.then)), `${table.ruleId} legal outcome`);
    assert.ok(table.rows.length >= table.conditions.length, `${table.ruleId} enough independence rows`);
    for (const row of table.rows) assert.equal(row.when.length, table.conditions.length, `${table.ruleId}/${row.id} arity`);
  }
});
