import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../../../src/infrastructure/pilot/persistence/persistence-controller.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const controllerModule = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

test("debounced drafts keep only the latest value and flush immediately", async () => {
  const saved = [];
  const states = [];
  const controller = controllerModule.createPilotDraftPersistenceController({
    delayMs: 1000,
    save: async (value) => saved.push(value),
    onState: (state) => states.push(state),
  });

  controller.schedule("first");
  controller.schedule("latest");
  await controller.flush();

  assert.deepEqual(saved, ["latest"]);
  assert.deepEqual(states, ["local-saving", "local-saving", "local-saved"]);
  controller.dispose();
});

test("a failed draft write reports an error and later writes can recover", async () => {
  const saved = [];
  const states = [];
  let attempts = 0;
  const controller = controllerModule.createPilotDraftPersistenceController({
    save: async (value) => {
      attempts += 1;
      if (attempts === 1) throw new Error("quota");
      saved.push(value);
    },
    onState: (state) => states.push(state),
  });

  controller.schedule("failed");
  await assert.rejects(controller.flush(), /quota/);
  controller.schedule("recovered");
  await controller.flush();

  assert.deepEqual(saved, ["recovered"]);
  assert.deepEqual(states, ["local-saving", "error", "local-saving", "local-saved"]);
  controller.dispose();
});

test("A5 SYNC-01: keyed remote writes serialize per case while different cases remain independent", async () => {
  const queue = controllerModule.createPilotKeyedPersistenceQueue();
  const releases = new Map();
  const order = [];
  const wait = (label) => new Promise((resolve) => releases.set(label, resolve));

  const firstA = queue.enqueue("case-a", async () => { order.push("a1:start"); await wait("a1"); order.push("a1:end"); });
  const secondA = queue.enqueue("case-a", async () => { order.push("a2:start"); order.push("a2:end"); });
  const firstB = queue.enqueue("case-b", async () => { order.push("b1:start"); order.push("b1:end"); });
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.deepEqual(order, ["a1:start", "b1:start", "b1:end"]);
  releases.get("a1")();
  await Promise.all([firstA, secondA, firstB]);
  assert.deepEqual(order, ["a1:start", "b1:start", "b1:end", "a1:end", "a2:start", "a2:end"]);
});

test("A5 SYNC-01: blocking a case lets deletion drain existing work and rejects new writes", async () => {
  const queue = controllerModule.createPilotKeyedPersistenceQueue();
  let release;
  const existing = queue.enqueue("case-a", () => new Promise((resolve) => { release = resolve; }));
  await new Promise((resolve) => setTimeout(resolve, 0));
  queue.block("case-a");
  const late = await queue.enqueue("case-a", async () => "must-not-run");
  assert.equal(late, undefined);
  release("saved");
  await queue.drain("case-a");
  assert.equal(await existing, "saved");
  queue.unblock("case-a");
  assert.equal(await queue.enqueue("case-a", async () => "retry"), "retry");
});
