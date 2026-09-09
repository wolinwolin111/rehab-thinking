"use client";

import { useState } from "react";
import { ActionButton } from "@/src/features/rehabmind/components/shared/presentation/action-button";
import { Disclosure } from "@/src/features/rehabmind/components/shared/presentation/disclosure";
import { StatusNotice } from "@/src/features/rehabmind/components/shared/presentation/status-notice";
import { ChoiceButton, ChoiceGroup } from "@/src/features/rehabmind/components/shared/presentation/choice-button";
import { TaskCard } from "@/src/features/rehabmind/components/shared/presentation/task-card";
import { TaskHeading } from "@/src/features/rehabmind/components/shared/presentation/task-heading";
import { StageTransition } from "@/src/features/rehabmind/components/shared/presentation/stage-transition";

/**
 * 表现层组件状态预览（仅测试工作台）。
 *
 * 全部使用真实组件 + 合成 props（方案 §11.1 证据层级一），不创建案例、
 * 不进入生产流程。总结 tone 色档复用与 summary-stage 相同的真实 DOM
 * 结构与作用域链（.rm-app[data-mobile-ui="v2"] .rm-session-hero
 * .rm-function-action-summary），用于补齐 RQ-4 中 improved/worse 两档
 * 无法用夹具复测的视觉证据；样式全部来自真实 CSS，不做预览专用覆盖。
 * ActionRail 不在此预览：fixed 框架的几何已由各页面验证覆盖。
 */

const OUTCOME_ROWS = [
  { id: "improved", liClass: "is-retested is-outcome-improved", label: "下蹲", initial: "第一次能完成，不适 5/10", retest: "不适降到 2/10" },
  { id: "worse", liClass: "is-retested is-outcome-worse", label: "下楼或下台阶", initial: "第一次能完成，不适 4/10", retest: "更不舒服，6/10" },
  { id: "unchanged", liClass: "is-retested is-outcome-unchanged", label: "单腿站立", initial: "第一次能完成，不适 3/10", retest: "仍为 3/10" },
  { id: "completed", liClass: "is-retested is-outcome-completed", label: "靠墙静蹲", initial: "第一次能完成", retest: "这次不需要复查" },
  { id: "neutral", liClass: "is-retested is-outcome-neutral", label: "起立坐下", initial: "第一次能完成", retest: "两侧结果混合，逐侧为准" },
  { id: "pending", liClass: "is-pending", label: "跪坐", initial: "第一次因不舒服没有做完", retest: "本次未复查" },
] as const;

export function PresentationPreviewPanel() {
  const [choices, setChoices] = useState<string[]>(["walk-stand"]);
  const toggleChoice = (id: string) => setChoices((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  return <div className="rm-test-preview" data-testid="presentation-preview">
    <p className="rm-test-preview-note" role="note">表现层组件预览：真实组件 + 合成 props，样式全部来自真实 CSS；不创建案例，不作为流程证据。</p>

    <section className="rm-test-preview-block" data-testid="preview-action-buttons">
      <h2>ActionButton · 四变体与状态</h2>
      <div className="rm-test-preview-row">
        <ActionButton variant="primary">主操作</ActionButton>
        <ActionButton variant="secondary">次操作</ActionButton>
        <ActionButton variant="quiet">弱化操作</ActionButton>
        <ActionButton variant="danger">停止操作</ActionButton>
      </div>
      <div className="rm-test-preview-row">
        <ActionButton variant="primary" disabled>禁用主操作</ActionButton>
        <ActionButton variant="secondary" disabled>禁用次操作</ActionButton>
        <ActionButton variant="primary" size="compact">紧凑主操作</ActionButton>
        <ActionButton variant="secondary" size="compact">紧凑次操作</ActionButton>
      </div>
    </section>

    <section className="rm-test-preview-block" data-testid="preview-status-notices">
      <h2>StatusNotice · 四 tone</h2>
      <StatusNotice tone="neutral" title="中性说明">
        <p>这段说明只解释规则，不携带需要即时确认的状态。</p>
      </StatusNotice>
      <StatusNotice tone="success" title="改善信号" live>
        <p>刚才的处理让活动变轻了，记录已保存。</p>
      </StatusNotice>
      <StatusNotice tone="warning" title="需要确认" live action={<ActionButton variant="secondary" size="compact">去确认</ActionButton>}>
        <p>还有一项反馈没有选择，完成后才能进入下一步。</p>
      </StatusNotice>
      <StatusNotice tone="danger" title="停止信号">
        <p>症状比处理前更重。先停止刚才的处理，只确认变化。</p>
      </StatusNotice>
    </section>

    <section className="rm-test-preview-block" data-testid="preview-disclosures">
      <h2>Disclosure · boxed 与 quiet</h2>
      <Disclosure summary="查看详细记录（boxed）">
        <p>展开后的内容区。默认收起，点按标题行切换。</p>
      </Disclosure>
      <Disclosure summary="默认展开的说明（boxed）" defaultOpen>
        <p>defaultOpen 时内容直接可见。</p>
      </Disclosure>
      <Disclosure summary="弱化行（quiet）" tone="quiet">
        <p>quiet 行没有边框容器，用于内联帮助段。</p>
      </Disclosure>
    </section>

    <section className="rm-test-preview-block" data-testid="preview-choice-buttons">
      <h2>ChoiceButton · 选中用标记与 aria-pressed 表达</h2>
      <ChoiceGroup label="诱发动作（可多选）" note="合成示例">
        <ChoiceButton selected={choices.includes("walk-stand")} onClick={() => toggleChoice("walk-stand")}>走路、站立或负重</ChoiceButton>
        <ChoiceButton selected={choices.includes("sport")} onClick={() => toggleChoice("sport")}>运动过程中</ChoiceButton>
        <ChoiceButton selected={choices.includes("press")} alert onClick={() => toggleChoice("press")}>按压时（警示档）</ChoiceButton>
        <ChoiceButton selected={false} disabled onClick={() => {}}>暂不可用项</ChoiceButton>
      </ChoiceGroup>
    </section>

    <section className="rm-test-preview-block" data-testid="preview-task-heading">
      <h2>TaskHeading · 进度徽章带标签</h2>
      <TaskHeading eyebrow="第 3 次康复 · 评估检查" title="逐项检查关节与肌肉" current={1} total={4} note="合成示例：徽章必须带“当前/共”标签" />
      <TaskHeading eyebrow="第 3 次康复 · 评估检查" title="无进度的标题形态" />
    </section>

    <section className="rm-test-preview-block" data-testid="preview-task-cards">
      <h2>TaskCard · 状态只落在局部边缘</h2>
      <TaskCard tone="neutral" testId="preview-card-neutral" answered={true}>
        <p>中性卡：白面、浅边框， answered=yes 用于缺项定位契约演示。</p>
      </TaskCard>
      <TaskCard tone="caution" testId="preview-card-caution">
        <p>警示卡（caution）：局部边缘提示，不做整卡渐变。</p>
      </TaskCard>
      <TaskCard tone="alert" testId="preview-card-alert">
        <p>停止卡（alert）：红边只标记状态，不由颜色单独承载语义。</p>
      </TaskCard>
    </section>

    <section className="rm-test-preview-block" data-testid="preview-stage-transition">
      <h2>StageTransition · 阶段过渡卡</h2>
      <StageTransition
        number="02"
        title="检查完成，看看结果"
        message="评估结果会汇总在这里"
        button="查看评估结果"
        onContinue={() => {}}
        onBack={() => {}}
      />
    </section>

    <section className="rm-test-preview-block" data-testid="preview-summary-tones">
      <h2>总结动作变化 · 五 outcome 色档（v2 移动皮肤）</h2>
      <p className="rm-test-preview-scope">真实作用域：.rm-app[data-mobile-ui=&quot;v2&quot;] .rm-session-hero .rm-function-action-summary</p>
      <div className="rm-app" data-mobile-ui="v2" data-testid="preview-tone-shell">
        <section className="rm-session-hero">
          <div className="rm-chief-action-summary rm-function-action-summary">
            <span>本次动作变化（合成示例）</span>
            <ul>
              {OUTCOME_ROWS.map((row) => <li key={row.id} className={row.liClass} data-preview-tone={row.id}>
                <strong>{row.label}</strong>
                <small>{row.initial}</small>
                <em>{row.retest}</em>
              </li>)}
            </ul>
          </div>
        </section>
      </div>
    </section>
  </div>;
}
