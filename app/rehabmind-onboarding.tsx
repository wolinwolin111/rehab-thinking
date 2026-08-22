"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import type { CSSProperties } from "react";

type FocusStep = {
  eyebrow: string;
  title: string;
  description: string;
  targetLabel: string;
  targetKeys: string[];
  placement: "top" | "right" | "bottom";
};

const FOCUS_STEPS: FocusStep[] = [
  {
    eyebrow: "先认识工作台",
    title: "这里是 RehabMind",
    description: "它把症状、观察、处理和恢复变化放在同一条康复记录里，帮助你按顺序留下可回看的过程。",
    targetLabel: "工作台入口",
    targetKeys: ["brand", "topbar"],
    placement: "bottom",
  },
  {
    eyebrow: "第 1 步 · 症状信息",
    title: "先写下你现在的不适",
    description: "从这里开始写：哪边哪里、什么时候出现、什么动作不舒服、想恢复什么。不确定的内容可以直接写“不清楚”。",
    targetLabel: "症状输入框",
    targetKeys: ["symptom-input", "symptom-block"],
    placement: "right",
  },
  {
    eyebrow: "提交这一段原话",
    title: "写完后点击“帮我整理”",
    description: "它只会把你的原话整理成待确认信息，后续仍由你或专业人员确认，不替你做康复决策。",
    targetLabel: "帮我整理",
    targetKeys: ["organize", "symptom-block"],
    placement: "top",
  },
  {
    eyebrow: "按顺序推进",
    title: "跟着流程逐步记录",
    description: "流程栏会显示当前阶段和可以回看的内容。每一步都保留记录，不需要一次把整套评估完成。",
    targetLabel: "康复流程",
    targetKeys: ["flow", "flow-mobile"],
    placement: "right",
  },
  {
    eyebrow: "随时可以回来",
    title: "从康复记录继续上次进度",
    description: "保存后，从这里可以找到本机保留的案例，继续已有记录，或者新建一份评估。",
    targetLabel: "康复记录",
    targetKeys: ["records", "top-actions"],
    placement: "bottom",
  },
];

type Rect = { top: number; left: number; right: number; bottom: number; width: number; height: number };
type OverlayStyle = CSSProperties & Record<"--rm-focus-top" | "--rm-focus-left" | "--rm-focus-width" | "--rm-focus-height", string>;

function isVisible(element: Element) {
  const node = element as HTMLElement;
  const style = window.getComputedStyle(node);
  const rect = node.getBoundingClientRect();
  return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
}

function findTarget(targetKeys: string[]) {
  for (const targetKey of targetKeys) {
    const element = document.querySelector(`[data-rehabmind-tutorial="${targetKey}"]`);
    if (element && isVisible(element)) return element;
  }
  return null;
}

function readRect(element: Element): Rect {
  const rect = element.getBoundingClientRect();
  return { top: rect.top, left: rect.left, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function getTooltipPosition(target: Rect | null, placement: FocusStep["placement"], isLast: boolean) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const width = viewportWidth <= 820 ? Math.max(270, viewportWidth - 32) : Math.min(330, viewportWidth - 32);
  const height = viewportWidth <= 820 ? (isLast ? 350 : 260) : isLast ? 420 : 360;
  const gap = 18;
  if (!target) return { left: Math.max(16, (viewportWidth - width) / 2), top: Math.max(16, (viewportHeight - height) / 2), width, side: "bottom" as const };

  let left = clamp(target.left + (target.width - width) / 2, 16, viewportWidth - width - 16);
  let top = target.bottom + gap;
  let side: FocusStep["placement"] = placement;
  if (placement === "top") {
    top = target.top - height - gap;
    if (top < 16) {
      top = target.bottom + gap;
      side = "bottom";
    }
  }
  if (placement === "right") {
    if (target.right + gap + width <= viewportWidth - 16) {
      left = target.right + gap;
      top = clamp(target.top + Math.min(0, (target.height - height) / 2), 16, viewportHeight - height - 16);
    } else if (target.top - height - gap >= 16) {
      top = target.top - height - gap;
      side = "top";
    } else if (target.bottom + height + gap <= viewportHeight - 16) {
      top = target.bottom + gap;
      side = "bottom";
    } else {
      left = 16;
      top = clamp(target.top, 16, viewportHeight - height - 16);
    }
  }
  return { left: clamp(left, 16, viewportWidth - width - 16), top: clamp(top, 16, viewportHeight - height - 16), width, side };
}

export function RehabMindOnboarding({
  open,
  onSkip,
  onFinish,
}: {
  open: boolean;
  onSkip: () => void;
  onFinish: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const current = FOCUS_STEPS[currentIndex];
  const isLast = currentIndex === FOCUS_STEPS.length - 1;

  useEffect(() => {
    if (!open) return;
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onSkip();
    };
    document.addEventListener("keydown", closeWithEscape);
    return () => document.removeEventListener("keydown", closeWithEscape);
  }, [onSkip, open]);

  useLayoutEffect(() => {
    if (!open) return;
    let frame = 0;
    const update = (scrollIntoView: boolean) => {
      const element = findTarget(current.targetKeys);
      if (!element) {
        setTargetRect(null);
        return;
      }
      if (scrollIntoView) element.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
      frame = window.requestAnimationFrame(() => setTargetRect(readRect(element)));
    };
    update(true);
    const handleViewportChange = () => {
      window.cancelAnimationFrame(frame);
      update(false);
    };
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    const observer = new MutationObserver(() => update(false));
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
      observer.disconnect();
    };
  }, [current.targetKeys, currentIndex, open]);

  if (!open) return null;

  const tooltip = getTooltipPosition(targetRect, current.placement, isLast);
  const spotlightStyle: OverlayStyle | undefined = targetRect ? {
    "--rm-focus-top": `${targetRect.top - 7}px`,
    "--rm-focus-left": `${targetRect.left - 7}px`,
    "--rm-focus-width": `${targetRect.width + 14}px`,
    "--rm-focus-height": `${targetRect.height + 14}px`,
  } : undefined;
  const tooltipStyle: CSSProperties = { left: tooltip.left, top: tooltip.top, width: tooltip.width };

  return <div className={`rm-focus-onboarding${targetRect ? " is-anchored" : " is-unanchored"}`} role="dialog" aria-modal="true" aria-labelledby="rm-focus-title">
    {targetRect ? <div className="rm-focus-spotlight" style={spotlightStyle} aria-hidden="true" /> : <div className="rm-focus-dim" aria-hidden="true" />}
    <section className={`rm-focus-tooltip is-${tooltip.side}${targetRect ? "" : " is-unanchored"}`} style={tooltipStyle}>
      <header className="rm-focus-header">
        <div><span>RehabMind 入门</span><strong>{currentIndex + 1} / {FOCUS_STEPS.length}</strong></div>
        <button type="button" className="rm-focus-skip" onClick={onSkip}>跳过教程</button>
      </header>
      <div className="rm-focus-progress" aria-label={`教程进度，第${currentIndex + 1}步，共${FOCUS_STEPS.length}步`}>
        {FOCUS_STEPS.map((step, index) => <i key={step.title} className={index <= currentIndex ? "is-active" : ""} />)}
      </div>
      <div className="rm-focus-target"><i aria-hidden="true" />正在看：{current.targetLabel}</div>
      <div className="rm-focus-copy"><span>{current.eyebrow}</span><h1 id="rm-focus-title">{current.title}</h1><p>{current.description}</p></div>
      {isLast ? <p className="rm-focus-boundary">它用于整理康复过程，不替代医生诊断，也不使用 AI 代替用户或专业人员做康复决策。</p> : null}
      <footer className="rm-focus-footer">
        <button type="button" className="rm-focus-back" onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))} disabled={currentIndex === 0}>上一步</button>
        {isLast ? <button type="button" className="rm-primary rm-focus-next" onClick={onFinish}>开始使用</button> : <button type="button" className="rm-primary rm-focus-next" onClick={() => setCurrentIndex((index) => Math.min(FOCUS_STEPS.length - 1, index + 1))}>下一步</button>}
      </footer>
    </section>
  </div>;
}
