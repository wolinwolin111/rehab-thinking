"use client";

import { useEffect } from "react";

export function RehabMindOnboarding({
  open,
  canContinue,
  onContinue,
  onStart,
}: {
  open: boolean;
  canContinue: boolean;
  onContinue: () => void;
  onStart: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && canContinue) onContinue();
    };
    document.addEventListener("keydown", closeWithEscape);
    return () => document.removeEventListener("keydown", closeWithEscape);
  }, [canContinue, onContinue, open]);

  if (!open) return null;

  return <div className="rm-product-welcome" role="dialog" aria-modal="true" aria-labelledby="rm-welcome-title">
    <div className="rm-product-welcome-inner">
      <header><b>RM</b><span>悦舒运动康复</span></header>
      <section>
        <span>悦舒运动康复</span>
        <h1 id="rm-welcome-title">你的线上康复助手</h1>
        <p>把悦舒运动康复的线下经验带到你身边，陪你完成每一次康复。</p>
        <div>
          <button type="button" className="rm-primary" onClick={onStart}>开始康复</button>
          {canContinue ? <button type="button" onClick={onContinue}>继续以前的康复</button> : null}
        </div>
      </section>
      <footer>康复建议不能替代医生诊断；出现明显加重或安全提示时，请先停止并寻求线下帮助。</footer>
    </div>
  </div>;
}
