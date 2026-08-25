import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("first-use pages use the approved patient-facing copy", async () => {
  const [welcome, source, consent, symptom] = await Promise.all([
    read("../../src/features/rehabmind/components/onboarding/rehabmind-onboarding.tsx"),
    read("../../src/features/rehabmind/components/onboarding/pilot-source-gate.tsx"),
    read("../../src/features/rehabmind/components/onboarding/pilot-consent-gate.tsx"),
    read("../../src/features/rehabmind/components/stages/symptom-stage.tsx"),
  ]);

  assert.match(welcome, /你的线上康复助手/);
  assert.match(welcome, /把悦舒运动康复的线下经验带到你身边，陪你完成每一次康复。/);
  assert.match(welcome, />开始康复</);
  assert.match(welcome, />继续以前的康复</);
  assert.match(source, /你从哪里了解到我们？/);
  assert.match(consent, /康复内容会使用匿名案例编号保存/);
  assert.match(consent, /不需要填写姓名、手机号等身份信息/);
  assert.match(consent, /你可以在应用内删除案例/);
  assert.match(consent, /我已了解并同意以上内容/);
  assert.match(consent, /同意并创建案例/);
  assert.match(symptom, /请描述你的问题/);
  assert.match(symptom, /请说明不适部位、出现时间、受影响的动作和恢复目标。/);
  assert.match(symptom, /不适部位 · 出现时间 · 受影响动作 · 恢复目标/);
  assert.match(symptom, /不清楚的内容可以写“不清楚”。/);
  assert.match(symptom, />继续</);

  const allCopy = `${welcome}\n${source}\n${consent}\n${symptom}`;
  assert.doesNotMatch(allCopy, /按你自己的话说就行/);
  assert.doesNotMatch(allCopy, /帮助你看清哪些方向值得继续/);
  assert.doesNotMatch(allCopy, /检查、处理、复测和训练/);
});

test("first-use wiring creates the anonymous case before consent closes", async () => {
  const workbench = await read("../../src/features/rehabmind/components/workbench/rehabmind-workbench.tsx");
  const sourceHandler = workbench.slice(
    workbench.indexOf("function handlePilotSourceContinue"),
    workbench.indexOf("async function createInitialPilotCaseRecord"),
  );
  const consentHandler = workbench.slice(
    workbench.indexOf("async function handlePilotConsentAgree"),
    workbench.indexOf("function handlePilotConsentDecline"),
  );

  assert.match(sourceHandler, /pilotSourceRef\.current = source/);
  assert.match(sourceHandler, /setPilotConsentGateOpen\(true\)/);
  assert.match(consentHandler, /await createInitialPilotCaseRecord\(record\)/);
  assert.match(consentHandler, /setPilotConsentGateOpen\(false\)/);
  assert.ok(
    consentHandler.indexOf("await createInitialPilotCaseRecord(record)") < consentHandler.indexOf("setPilotConsentGateOpen(false)"),
    "consent must stay visible until the server confirms case creation",
  );
  assert.match(workbench, /await createPilotCase\(\{/);
  assert.match(workbench, /source,\s*\n\s*consent,/);
});
