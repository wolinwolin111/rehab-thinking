import assert from "node:assert/strict";
import test from "node:test";
import { loadTypeScriptModule } from "../../support/load-typescript-module.mjs";

const persistence = await loadTypeScriptModule("./src/infrastructure/pilot/persistence/persistence-controller.ts");

test("SAVE-EX-01: local draft failure reports error and does not claim saved", async () => {
  const states = [];
  const controller = persistence.createPilotDraftPersistenceController({
    delayMs: 0,
    save: async () => { throw new Error("offline"); },
    onState: (state) => states.push(state),
  });

  controller.schedule({ text: "本机草稿" });
  await assert.rejects(() => controller.flush(), /offline/);

  assert.deepEqual(states, ["local-saving", "error"]);
  assert.equal(states.includes("local-saved"), false);
  controller.dispose();
});

test("SAVE-EX-02: newer draft waits for the earlier write and becomes the final persisted value", async () => {
  const writes = [];
  let releaseFirst;
  const firstWrite = new Promise((resolve) => { releaseFirst = resolve; });
  const controller = persistence.createPilotDraftPersistenceController({
    delayMs: 0,
    save: async (value) => {
      writes.push(value);
      if (value === "first") await firstWrite;
    },
  });

  controller.schedule("first");
  const firstFlush = controller.flush();
  controller.schedule("second");
  const secondFlush = controller.flush();
  await Promise.resolve();
  assert.deepEqual(writes, ["first"]);
  releaseFirst();
  await Promise.all([firstFlush, secondFlush]);
  assert.deepEqual(writes, ["first", "second"]);
  controller.dispose();
});

test("SAVE-EX-03: a blocked case cannot enqueue a late write after deletion", async () => {
  const queue = persistence.createPilotKeyedPersistenceQueue();
  const writes = [];
  queue.block("case-a");
  assert.equal(await queue.enqueue("case-a", async () => writes.push("stale")), undefined);
  assert.deepEqual(writes, []);

  queue.unblock("case-a");
  await queue.enqueue("case-a", async () => writes.push("current"));
  await queue.drain("case-a");
  assert.deepEqual(writes, ["current"]);
});

