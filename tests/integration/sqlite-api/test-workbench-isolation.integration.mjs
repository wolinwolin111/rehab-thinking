import assert from "node:assert/strict";
import test from "node:test";
import { completePilotSnapshot, createSqliteApiHarness } from "./support.mjs";

function testInput(clientCreationId, scenarioId, testRunId) {
  return {
    clientCreationId,
    accessToken: `${clientCreationId}-access-token`,
    initialSnapshot: completePilotSnapshot({ step: 0, trainingComplete: false }),
    currentStage: "症状信息",
    isBilateral: false,
    hasSafetyStop: false,
    scenarioId,
    testRunId,
  };
}

test("TEST-WORKBENCH-01: protected test cases are isolated from user metrics and removable by run", async () => {
  const harness = await createSqliteApiHarness("test-workbench-isolation");
  const testRunId = "test_run_20260824_a";
  try {
    assert.equal((await harness.testAccess({ admin: false })).status, 401);
    assert.equal((await harness.testAccess()).status, 200);

    const regular = await harness.create({
      clientCreationId: "regular-creation",
      accessToken: "regular-access-token",
      initialSnapshot: completePilotSnapshot(),
      source: { channel: "xiaohongshu", detail: null },
      isTestCase: true,
      testRunId,
      scenarioId: "forged-scenario",
    });
    assert.equal(regular.status, 201);

    const first = await harness.createTest(testInput("test-creation-a", "knee-pain", testRunId));
    const second = await harness.createTest(testInput("test-creation-b", "ankle-sprain", testRunId));
    assert.equal(first.status, 201);
    assert.equal(second.status, 201);
    assert.match(first.body.case.publicCode, /^TEST-/);

    const rows = harness.inspect((sqlite) => sqlite.prepare(
      "SELECT is_test_case AS isTestCase, test_run_id AS testRunId, scenario_id AS scenarioId, created_by AS createdBy, source_channel AS sourceChannel FROM pilot_cases ORDER BY client_creation_id",
    ).all());
    const regularRow = rows.find((row) => row.testRunId === null);
    assert.equal(regularRow.isTestCase, 0);
    assert.equal(regularRow.sourceChannel, "xiaohongshu");
    assert.deepEqual(rows.filter((row) => row.testRunId === testRunId).map((row) => ({ ...row, isTestCase: Boolean(row.isTestCase) })), [
      { isTestCase: true, testRunId, scenarioId: "knee-pain", createdBy: "test_workbench", sourceChannel: "internal_test" },
      { isTestCase: true, testRunId, scenarioId: "ankle-sprain", createdBy: "test_workbench", sourceChannel: "internal_test" },
    ]);

    const testCases = await harness.adminCases("isTestCase=true");
    const userCases = await harness.adminCases("isTestCase=false");
    assert.equal(testCases.body.page.total, 2);
    assert.equal(userCases.body.page.total, 1);

    const metrics = await harness.adminMetrics();
    assert.equal(metrics.body.metrics.casesCreated, 1);
    assert.deepEqual(metrics.body.metrics.sourceChannels, { xiaohongshu: 1 });

    const deleted = await harness.deleteTestRun(testRunId);
    assert.deepEqual(deleted.body, { deleted: 2, testRunId });
    assert.equal(harness.inspect((sqlite) => sqlite.prepare("SELECT count(*) AS count FROM pilot_cases").get().count), 1);
  } finally {
    await harness.close();
  }
});
