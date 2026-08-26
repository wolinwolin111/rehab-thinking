"use client";

import { useLayoutEffect, useState } from "react";
import type { CSSProperties } from "react";
import { FOCUS_STEPS } from "./onboarding-steps";
import { useDialogAccessibility } from "@/src/features/rehabmind/components/shared/use-dialog-accessibility";

type Rect = { top: number; left: number; right: number; bottom: number; width: number; height: number };
type OverlayStyle = CSSProperties & Record<"--rm-focus-top" | "--rm-focus-left" | "--rm-focus-width" | "--rm-focus-height", string>;

export type RehabMindOnboardingMode = "welcome" | "focus";

export function RehabMindOnboarding({
  open,
  mode = "focus",
  canContinue,
  onContinue,
  onStart,
  onSkip,
}: {
  open: boolean;
  mode?: RehabMindOnboardingMode;
  canContinue?: boolean;
  onContinue?: () => void;
  onStart?: () => void;
  onSkip?: () => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const step = mode === "focus" ? FOCUS_STEPS[stepIndex] : undefined;
  const isFocusMode = mode === "focus" && step !== undefined;
  const isLast = !isFocusMode || stepIndex === FOCUS_STEPS.length - 1;

  const dismiss = () => {
    if (onSkip) onSkip();
    else if (onContinue) onContinue();
  };
  const dialogRef = useDialogAccessibility<HTMLDivElement>({ open, onClose: dismiss });

  useLayoutEffect(() => {
    if (!open || !isFocusMode || !step) return;
    let frame = 0;
    const update = (scroll = false) => {
      const el = findTarget(step.targetKeys);
      if (!el) { setTargetRect(null); return; }
      if (scroll) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      frame = requestAnimationFrame(() => setTargetRect(readRect(el)));
    };
    update(true);
    const onResize = () => { cancelAnimationFrame(frame); update(false); };
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    const obs = new MutationObserver(() => update(false));
    obs.observe(document.body, { childList: true, subtree: true });
    return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", onResize); window.removeEventListener("scroll", onResize, true); obs.disconnect(); };
  }, [open, isFocusMode, stepIndex, step]);

  if (!open) return null;

  // ---- 欢迎页模式（无聚焦） ----
  if (!isFocusMode) {
    return <div ref={dialogRef} className="rm-product-welcome" role="dialog" aria-modal="true" aria-labelledby="rm-welcome-title" tabIndex={-1}>
      <div className="rm-product-welcome-inner">
        <header><b>RM</b><span>悦舒运动康复</span></header>
        <section>
          <span>悦舒运动康复</span>
          <h1 id="rm-welcome-title">你的线上康复助手</h1>
          <p className="rm-welcome-lines"><span>把线下康复经验带到这里</span><span>一步步引导完成评估、处理和训练</span><span>跟着提示操作就好</span></p>
          <div>
            <button type="button" className="rm-primary" onClick={() => { onStart?.(); }}>开始康复</button>
            {canContinue ? <button type="button" onClick={() => { onContinue?.(); }}>继续以前的康复</button> : null}
          </div>
        </section>
        <footer>康复建议不能替代医生诊断；出现明显加重或安全提示时，请先停止并寻求线下帮助。<small className="rm-welcome-note">康复效果因人而异；多次改善不明显时，建议寻求线下康复师帮助。</small></footer>
      </div>
    </div>;
  }

  // ---- 聚焦教程模式 ----
  const current = step!;
  const tooltip = getTooltipPosition(targetRect, current.placement, isLast);
  const spotlightStyle: OverlayStyle | undefined = targetRect ? {
    "--rm-focus-top": `${targetRect.top - 7}px`,
    "--rm-focus-left": `${targetRect.left - 7}px`,
    "--rm-focus-width": `${targetRect.width + 14}px`,
    "--rm-focus-height": `${targetRect.height + 14}px`,
  } : undefined;

  return <div ref={dialogRef} className={`rm-focus-onboarding${targetRect ? " is-anchored" : " is-unanchored"}`} role="dialog" aria-modal="true" aria-labelledby="rm-focus-title" tabIndex={-1}>
    {targetRect ? <div className="rm-focus-spotlight" style={spotlightStyle} aria-hidden="true" /> : <div className="rm-focus-dim" aria-hidden="true" />}
    <section className={`rm-focus-tooltip is-${tooltip.side}${targetRect ? "" : " is-unanchored"}`} style={{ left: tooltip.left, top: tooltip.top, width: tooltip.width }}>
      <header className="rm-focus-header">
        <div><span>RehabMind 入门</span><strong>{stepIndex + 1} / {FOCUS_STEPS.length}</strong></div>
        <button type="button" className="rm-focus-skip" onClick={dismiss}>跳过教程</button>
      </header>
      <div className="rm-focus-progress" aria-label={`教程进度，第${stepIndex + 1}步，共${FOCUS_STEPS.length}步`}>
        {FOCUS_STEPS.map((_, i) => <i key={i} className={i <= stepIndex ? "is-active" : ""} />)}
      </div>
      <div className="rm-focus-target"><i aria-hidden="true" />正在看：{current.targetLabel}</div>
      <div className="rm-focus-copy"><span>{current.eyebrow}</span><h1 id="rm-focus-title">{current.title}</h1><p>{current.description}</p></div>
      <footer className="rm-focus-footer">
        <button type="button" className="rm-focus-back" disabled={stepIndex === 0} onClick={() => setStepIndex((i) => Math.max(0, i - 1))}>上一步</button>
        <button type="button" className="rm-primary rm-focus-next" onClick={isLast ? dismiss : () => setStepIndex((i) => i + 1)}>
          {isLast ? "开始使用" : "下一步"}
        </button>
      </footer>
    </section>
  </div>;
}

// ---- 定位工具 ----

function findTarget(keys: string[]) {
  for (const key of keys) {
    const el = document.querySelector(`[data-rehabmind-tutorial="${key}"]`);
    if (el && isVisible(el)) return el;
  }
  return null;
}

function isVisible(el: Element) {
  const node = el as HTMLElement;
  const style = window.getComputedStyle(node);
  const rect = node.getBoundingClientRect();
  return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0;
}

function readRect(el: Element): Rect {
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
}

function getTooltipPosition(target: Rect | null, placement: string, isLast: boolean) {
  const vw = window.innerWidth;
  const width = vw <= 820 ? Math.max(270, vw - 32) : Math.min(330, vw - 32);
  const height = vw <= 820 ? (isLast ? 350 : 260) : isLast ? 420 : 360;
  const gap = 18;
  if (!target) return { left: Math.max(16, (vw - width) / 2), top: Math.max(16, (window.innerHeight - height) / 2), width, side: "bottom" };
  const left = clamp(target.left + (target.width - width) / 2, 16, vw - width - 16);
  let top = target.bottom + gap;
  let side = placement;
  if (placement === "top") { top = target.top - height - gap; side = "top"; if (top < 16) { top = target.bottom + gap; side = "bottom"; } }
  return { left: clamp(left, 16, Math.max(16, vw - width - 16)), top: clamp(top, 16, Math.max(16, window.innerHeight - height - 16)), width, side };
}

function clamp(v: number, min: number, max: number) { return Math.min(Math.max(v, min), Math.max(min, max)); }
