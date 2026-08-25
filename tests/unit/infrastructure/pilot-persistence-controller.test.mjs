import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../app/pilot-persistence-controller.ts", import.meta.url), "utf8");
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

