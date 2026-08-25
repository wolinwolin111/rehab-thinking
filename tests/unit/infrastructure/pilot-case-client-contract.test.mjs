import assert from "node:assert/strict";
import test from "node:test";
import { loadTypeScriptModule } from "../../support/load-typescript-module.mjs";

const client = await loadTypeScriptModule("./src/infrastructure/pilot/api/case-client.ts");

test("A5 SYNC-01: save requests carry request, case, session, and base revision identity", async () => {
  const originalFetch = globalThis.fetch;
  let captured;
  globalThis.fetch = async (input, init) => {
    captured = { input: String(input), init, body: JSON.parse(String(init?.body)) };
    return Response.json({
      progress: {
        caseRecord: {},
        snapshot: { caseId: "case-a", revision: 5, payload: {}, createdAt: "now", updatedAt: "now" },
        event: {},
      },
    });
  };

  try {
    await client.savePilotCaseProgress({
      access: {
        caseId: "case-a",
        publicCode: "PUBLIC01",
        accessToken: "secret",
        revision: 4,
        versions: { appVersion: "app", knowledgeVersion: "knowledge", decisionVersion: "decision" },
      },
      requestId: "request-a",
      sessionId: "session-2",
      snapshot: {},
      eventId: "event-a",
      eventType: "session_saved",
      eventPayload: {},
      currentStage: "康复总结",
      isBilateral: false,
      hasSafetyStop: false,
      sessionCount: 2,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(captured.input, "/api/pilot/cases/case-a/progress");
  assert.equal(captured.init.headers["x-pilot-request-id"], "request-a");
  assert.equal(captured.body.requestId, "request-a");
  assert.equal(captured.body.caseId, "case-a");
  assert.equal(captured.body.sessionId, "session-2");
  assert.equal(captured.body.baseRevision, 4);
});

async function captureClientError(run) {
  try {
    await run();
    assert.fail("expected PilotCaseClientError");
  } catch (error) {
    assert.equal(error instanceof client.PilotCaseClientError, true);
    return error;
  }
}

test("A5 SYNC-01: timeout and network failures have deterministic client exits", async () => {
  const originalFetch = globalThis.fetch;
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;

  try {
    globalThis.setTimeout = (callback) => {
      queueMicrotask(callback);
      return 1;
    };
    globalThis.clearTimeout = () => {};
    globalThis.fetch = async (_input, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
    });
    const timeout = await captureClientError(() => client.readPilotCase({ caseId: "case-a", accessToken: "secret" }));
    assert.equal(timeout.status, 0);
    assert.equal(timeout.code, "timeout");
    assert.equal(timeout.message, "Request timed out");

    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
    globalThis.fetch = async () => { throw new Error("socket closed with secret"); };
    const network = await captureClientError(() => client.readPilotCase({ caseId: "case-a", accessToken: "secret" }));
    assert.equal(network.status, 0);
    assert.equal(network.code, "network");
    assert.equal(network.message, "Network unavailable");
    assert.doesNotMatch(network.message, /secret|socket/i);
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  }
});

test("A5 SYNC-01: 409, 429, and 500 responses remain distinguishable without exposing request credentials", async () => {
  const originalFetch = globalThis.fetch;
  const responses = [
    { status: 409, body: { code: "revision_conflict", error: "Case revision conflict" } },
    { status: 429, body: { code: "rate_limited", error: "Too many requests" } },
    { status: 500, body: null },
  ];
  globalThis.fetch = async () => {
    const next = responses.shift();
    return next.body === null
      ? new Response("not-json secret-token", { status: next.status })
      : Response.json(next.body, { status: next.status });
  };

  try {
    const conflict = await captureClientError(() => client.readPilotCase({ caseId: "case-a", accessToken: "secret-token" }));
    assert.deepEqual({ status: conflict.status, code: conflict.code, message: conflict.message }, {
      status: 409,
      code: "revision_conflict",
      message: "Case revision conflict",
    });

    const limited = await captureClientError(() => client.readPilotCase({ caseId: "case-a", accessToken: "secret-token" }));
    assert.deepEqual({ status: limited.status, code: limited.code, message: limited.message }, {
      status: 429,
      code: "rate_limited",
      message: "Too many requests",
    });

    const failure = await captureClientError(() => client.readPilotCase({ caseId: "case-a", accessToken: "secret-token" }));
    assert.equal(failure.status, 500);
    assert.equal(failure.code, "storage");
    assert.equal(failure.message, "Case service is temporarily unavailable");
    assert.doesNotMatch(failure.message, /secret-token/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
