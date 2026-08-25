import assert from "node:assert/strict";
import test from "node:test";
import { inspectAdditiveMigration } from "../../../scripts/data/migration-compatibility-core.mjs";

test("A7 REL-04: additive migrations are accepted and destructive rollback hazards are rejected", () => {
  assert.deepEqual(inspectAdditiveMigration("safe.sql", "ALTER TABLE cases ADD status text DEFAULT 'open' NOT NULL;"), []);
  assert.deepEqual(inspectAdditiveMigration("unsafe.sql", "ALTER TABLE cases ADD status text NOT NULL;"), [{ id: "unsafe.sql", code: "not-null-without-default" }]);
  assert.deepEqual(inspectAdditiveMigration("drop.sql", "DROP TABLE cases;"), [{ id: "drop.sql", code: "destructive-sql" }]);
});
