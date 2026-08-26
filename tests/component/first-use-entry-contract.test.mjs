import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { expectSourceContains, expectSourceNotContains } from "../support/source-contract-assert.mjs";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("first-use pages use the approved patient-facing copy", async () => {
  const [welcome, source, consent, symptom] = await Promise.all([
    read("../../src/features/rehabmind/components/onboarding/rehabmind-onboarding.tsx"),
    read("../../src/features/rehabmind/components/onboarding/pilot-source-gate.tsx"),
    read("../../src/features/rehabmind/components/onboarding/pilot-consent-gate.tsx"),
    read("../../src/features/rehabmind/components/stages/symptom-stage.tsx"),
  ]);

  expectSourceContains(welcome, { file: "rehabmind-onboarding.tsx", snippet: "你的线上康复助手" }, "首发文案表");
  // RQ-1 定性答复（2026-08-26）：价值承诺句迁移至欢迎页三行 grid 首行，旧长句废弃。
  assert.match(
    welcome,
    /rm-welcome-lines"><span>把线下康复经验带到这里<\/span>/,
    "价值承诺句必须是欢迎页三行 grid 的第一行",
  );
  assert.match(welcome, />开始康复/);
  assert.match(welcome, />继续以前的康复/);
  expectSourceContains(source, { file: "pilot-source-gate.tsx", snippet: "你从哪里了解到我们？" }, "首发文案表");
  for (const snippet of [
    "康复内容会使用匿名案例编号保存",
    "不需要填写姓名、手机号等身份信息",
    "你可以在应用内删除案例",
    "我已了解并同意以上内容",
    "同意并创建案例",
  ]) {
    expectSourceContains(consent, { file: "pilot-consent-gate.tsx", snippet }, "首发文案表");
  }
  for (const snippet of [
    "请描述你的问题",
    "请说明不适部位、出现时间、受影响的动作和恢复目标",
    "不清楚的内容可以写“不清楚”",
    ">继续<",
  ]) {
    expectSourceContains(symptom, { file: "symptom-stage.tsx", snippet }, "首发文案表");
  }
  assert.match(symptom, /不适部位 · 出现时间 · 受影响动作 · 恢复目标/);

  const allCopy = `${welcome}\n${source}\n${consent}\n${symptom}`;
  for (const forbidden of ["按你自己的话说就行", "帮助你看清哪些方向值得继续", "检查、处理、复测和训练"]) {
    expectSourceNotContains(allCopy, { file: "first-use 四页合集", snippet: forbidden }, "旧教程/开发者口吻禁用词");
  }
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
