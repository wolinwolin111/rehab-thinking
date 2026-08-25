// 全链路编排序列探索的可复用内核：动作生成、重放执行与收缩。
// 由 orchestrator-sequence-exploration.test.mjs 注册用例；诊断脚本可注入变异后的生产模块复用同一逻辑。
import assert from "node:assert/strict";

export function rng(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}
function pick(random, values) {
  return values[Math.floor(random() * values.length)];
}

const FLIP_KEYS = [
  "intakeComplete", "safetyComplete", "assessmentReadyForTreatment", "planIsCurrent",
  "trainingComplete", "trainingPlanSaved",
  "adverseResponse", "assessmentNeedsReferral", "queueRefreshing", "pendingAssessmentCheck",
  "safetySignal", "treatmentWorsened", "bilateral", "assessmentComplete",
];
const RESULTS = ["better", "partial", "same", "worse"];

export function generatePlan(random) {
  return Array.from({ length: 70 }, () => {
    const roll = random();
    if (roll < 0.34) return { type: "flip", key: pick(random, FLIP_KEYS) };
    if (roll < 0.44) {
      const targets = Array.from({ length: 1 + Math.floor(random() * 3) }, (_, t) => ({
        id: `target-${t}`,
        candidates: Array.from({ length: 1 + Math.floor(random() * 2) }, (_, c) => ({
          id: `t${t}-c${c}`,
          type: pick(random, ["muscle", "control", "joint", "neural"]),
        })),
      }));
      return { type: "init-queue", targets };
    }
    if (roll < 0.62) {
      return {
        type: "record-result",
        result: pick(random, RESULTS),
        activityWorsened: random() > 0.85,
        usePreferred: random() > 0.5,
      };
    }
    if (roll < 0.78) return { type: "navigate", targetStep: Math.floor(random() * 6) };
    if (roll < 0.86) return { type: "review", targetStep: Math.floor(random() * 6) };
    if (roll < 0.92) return { type: "edit", targetStep: Math.floor(random() * 6), explicitlyEnabled: random() > 0.5 };
    if (roll < 0.96) return { type: "followup", sessionNumber: 1 + Math.floor(random() * 3), priorExists: random() > 0.4 };
    return { type: "adverse", source: pick(random, ["treatment", "training", "after-session"]) };
  });
}

export function freshState() {
  return {
    step: 0,
    intakeComplete: false,
    safetyComplete: false,
    assessmentReadyForTreatment: false,
    planIsCurrent: true,
    trainingComplete: false,
    trainingPlanSaved: false,
    adverseResponse: false,
    assessmentNeedsReferral: false,
    queueRefreshing: false,
    pendingAssessmentCheck: false,
    safetySignal: false,
    treatmentWorsened: false,
    bilateral: false,
    assessmentComplete: false,
    priorSessionExists: false,
    sessionNumber: 1,
    targets: [],
    ti: 0,
    ci: 0,
    preferredTypes: [],
    pending: null,
    stopped: false,
  };
}

export function queueView(state) {
  const active = !state.stopped && state.targets.length > 0 && state.ti < state.targets.length;
  return {
    queueLength: active ? state.targets.length : 0,
    queueIndex: active ? state.ti : 0,
  };
}

export function applyCommand(state, command) {
  switch (command.type) {
    case "select-treatment-candidate":
      assert.ok(
        state.ti < state.targets.length && command.candidateIndex >= 0
          && command.candidateIndex < state.targets[state.ti].candidates.length,
        `select-treatment-candidate out of bounds: ${JSON.stringify(command)} cursor=ti:${state.ti},ci:${state.ci}`,
      );
      state.ci = command.candidateIndex;
      break;
    case "select-treatment-target":
      assert.ok(
        command.targetIndex >= 0 && command.targetIndex < state.targets.length,
        `select-treatment-target out of bounds: ${JSON.stringify(command)} targets=${state.targets.length}`,
      );
      state.ti = command.targetIndex;
      state.ci = command.candidateIndex;
      break;
    case "advance-treatment-target":
      state.ti += 1;
      state.ci = 0;
      break;
    case "stop-treatment":
      state.stopped = true;
      state.treatmentWorsened = true;
      break;
    case "clear-pending-queue-advance":
      state.pending = null;
      break;
    case "navigate-to-step":
    case "open-readonly-review":
    case "open-explicit-edit":
      state.step = command.step;
      break;
    case "start-followup":
      state.sessionNumber = command.sessionNumber;
      break;
    case "capture-adverse-response":
      state.adverseResponse = true;
      break;
    default:
      break;
  }
}

export function replay(workflow, invariants, ops) {
  const state = freshState();
  for (let index = 0; index < ops.length; index += 1) {
    const op = ops[index];
    switch (op.type) {
      case "flip": {
        // 建模边界：生产中两类状态跳变伴随页面级编排，均不在本纯推进模型内——
        // 1) 完成布尔撤销：经「返回修改门」（resolveReturnEditGate → 下游失效含 review-navigation）；
        // 2) 坏信号出现：页面路由到安全停止/聚焦复查等出口。
        // 统一守卫：翻转后若当前步将越权（step > maxUnlocked），视为应由未建模的页面流接管，跳过。
        const candidate = { ...state, [op.key]: !state[op.key] };
        const candidateProjection = workflow.projectWorkflowState({ ...candidate, ...queueView(candidate) });
        if (state.step > candidateProjection.maxUnlocked) continue;
        state[op.key] = !state[op.key];
        if (["queueRefreshing", "pendingAssessmentCheck"].includes(op.key)) continue;
        break;
      }
      case "init-queue": {
        state.targets = op.targets;
        state.ti = 0;
        state.ci = 0;
        state.stopped = false;
        state.pending = null;
        state.preferredTypes = [];
        break;
      }
      case "record-result": {
        if (state.stopped || !state.targets.length || state.ti >= state.targets.length || state.ci >= state.targets[state.ti].candidates.length) continue;
        state.preferredTypes = op.usePreferred ? ["control"] : [];
        const preTi = state.ti;
        const decision = workflow.orchestrateTreatmentRetest({
          candidates: state.targets[state.ti].candidates,
          startIndex: state.ci,
          preferredTypes: state.preferredTypes,
          getType: (candidate) => candidate.type,
          isEligible: () => true,
          result: op.result,
          activityWorsened: op.activityWorsened,
          targets: state.targets,
          startTargetIndex: state.ti,
          isEligibleAcrossTargets: () => true,
        });
        const position = decision.queueAdvance.nextTargetPosition;
        if (position) {
          // 设计 oracle：跨目标定位必须命中该目标内首个类型合格的候选（稳定顺序遍历）。
          const nextCandidates = state.targets[position.targetIndex].candidates;
          const expectedCi = Math.max(
            0,
            nextCandidates.findIndex((c) => !state.preferredTypes.length || state.preferredTypes.includes(c.type)),
          );
          assert.equal(
            position.candidateIndex,
            expectedCi,
            `cross-target pick not first-eligible at op=${index}: got ${position.candidateIndex} want ${expectedCi}`,
          );
        }
        for (const command of decision.commands) applyCommand(state, command);
        if (position) {
          // 先快照已完成目标再建 pending（applyCommand 已推进 ti，不能事后取）。
          const pending = workflow.createPendingTreatmentQueueAdvance(
            state.targets[preTi],
            state.targets[position.targetIndex],
          );
          const recompute = workflow.orchestrateTreatmentQueueRecomputed({
            currentIndex: preTi,
            targets: state.targets,
            pending,
          });
          for (const command of recompute.commands) applyCommand(state, command);
          // 稳定身份重算后必须落回同一目标（候选级由执行期 isEligible 把关，
          // 重算合同只负责目标级身份定位）。
          assert.equal(
            state.ti,
            position.targetIndex,
            `stable identity drifted after recompute at op=${index}: cursor ti=${state.ti} want ${position.targetIndex}`,
          );
        }
        // 设计 oracle（SYS-RESULT-002 / SYS-S02/S03）：任何形式的加重都必须停止处理链。
        assert.equal(
          state.stopped,
          op.activityWorsened || op.result === "worse",
          `worsening stop mismatch at op=${index}: result=${op.result} activityWorsened=${op.activityWorsened} stopped=${state.stopped}`,
        );
        break;
      }
      case "navigate": {
        const projection = workflow.projectWorkflowState({ ...state, ...queueView(state) });
        const decision = workflow.orchestrateWorkflowNavigation({
          currentStep: Math.min(state.step, 5),
          maxUnlocked: projection.maxUnlocked,
          event: { type: "navigate-requested", targetStep: op.targetStep },
        });
        assert.ok(!(decision.allowed && decision.commands.length === 0), `allowed navigation without command at op=${index}`);
        if (!decision.allowed) assert.equal(decision.commands.length, 0, `denied navigation emitted commands at op=${index}`);
        for (const command of decision.commands) applyCommand(state, command);
        break;
      }
      case "review": {
        const projection = workflow.projectWorkflowState({ ...state, ...queueView(state) });
        const decision = workflow.orchestrateWorkflowNavigation({
          currentStep: Math.min(state.step, 5),
          maxUnlocked: projection.maxUnlocked,
          event: { type: "review-requested", targetStep: op.targetStep },
        });
        for (const command of decision.commands) applyCommand(state, command);
        break;
      }
      case "edit": {
        const projection = workflow.projectWorkflowState({ ...state, ...queueView(state) });
        const decision = workflow.orchestrateWorkflowNavigation({
          currentStep: Math.min(state.step, 5),
          maxUnlocked: projection.maxUnlocked,
          event: { type: "edit-requested", targetStep: op.targetStep, explicitlyEnabled: op.explicitlyEnabled },
        });
        if (!op.explicitlyEnabled) {
          assert.ok(
            !decision.commands.some((command) => command.type === "open-explicit-edit"),
            `non-explicit edit opened at op=${index}`,
          );
        }
        for (const command of decision.commands) applyCommand(state, command);
        break;
      }
      case "followup": {
        const decision = workflow.orchestrateWorkflowNavigation({
          currentStep: Math.min(state.step, 5),
          maxUnlocked: 5,
          event: {
            type: "followup-started",
            sessionNumber: op.sessionNumber,
            priorSessionExists: op.priorExists && op.sessionNumber > 1,
          },
        });
        if (!op.priorExists || op.sessionNumber <= 1) {
          assert.equal(decision.allowed, false, `followup allowed without prior session at op=${index}`);
        }
        for (const command of decision.commands) applyCommand(state, command);
        break;
      }
      case "adverse": {
        const decision = workflow.orchestrateWorkflowNavigation({
          currentStep: Math.min(state.step, 5),
          maxUnlocked: 5,
          event: { type: "adverse-reported", source: op.source },
        });
        assert.equal(decision.allowed, true, "adverse reporting must never be locked");
        for (const command of decision.commands) applyCommand(state, command);
        break;
      }
      default:
        break;
    }

    // 每步全局断言：阶段不越权、投影不变量为空、命令应用后状态自洽。
    assert.ok(state.step >= 0 && state.step <= 5, `step out of range at op=${index}`);
    assert.ok(state.ci >= 0 && state.ti >= 0, `negative cursor at op=${index}`);
    const view = queueView(state);
    const projection = workflow.projectWorkflowState({ ...state, ...view });
    assert.ok(
      state.step <= projection.maxUnlocked,
      `stage bypass after op=${index}: step=${state.step} maxUnlocked=${projection.maxUnlocked} op=${JSON.stringify(ops[index])}`,
    );
    const codes = invariants.inspectWorkflowProjectionInvariants({ snapshotStep: state.step, projection });
    assert.deepEqual(codes, [], `invariant violation after op=${index}: ${codes.join(",")} op=${JSON.stringify(ops[index])}`);
  }
}

export function shrink(workflow, invariants, ops) {
  let minimal = [...ops];
  for (let index = 0; index < minimal.length;) {
    const candidate = minimal.slice(0, index).concat(minimal.slice(index + 1));
    try {
      replay(workflow, invariants, candidate);
      index += 1;
    } catch {
      minimal = candidate;
    }
  }
  return minimal;
}
