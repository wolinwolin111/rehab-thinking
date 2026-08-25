"use client";

import { useState } from "react";

const STORAGE_KEY = "rehabmind-guide-cards-seen";

const GUIDE_CARDS = [
  {
    icon: "🩺",
    title: "专属于你的线上康复伙伴",
    lines: [
      "把线下康复经验带到这里",
      "一步步引导完成评估、处理和训练",
      "跟着提示操作就好",
    ],
  },
  {
    icon: "💾",
    title: "进度自动保存",
    lines: [
      "每一步操作后系统自动保存",
      "随时关闭页面",
      "下次打开从上次位置继续",
      "不需要重新填写",
    ],
  },
  {
    icon: "💬",
    title: "有问题随时说",
    lines: [
      "右上角「问题反馈」",
      "遇到不清楚的选项或页面问题",
      "直接告诉我们",
    ],
  },
] as const;


export function GuideCards({
  open,
  onComplete,
  onSkip,
}: {
  open: boolean;
  onComplete: () => void;
  onSkip: () => void;
}) {
  const [index, setIndex] = useState(0);
  if (!open) return null;

  const card = GUIDE_CARDS[index];
  const isLast = index === GUIDE_CARDS.length - 1;

  return (
    <div
      className="rm-guide-cards-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rm-guide-title"
      onClick={(e) => { if (e.target === e.currentTarget) onSkip(); }}
    >
      <section className="rm-guide-cards-panel">
        <header className="rm-guide-cards-header">
          <span className="rm-guide-cards-progress-text">第 {index + 1} 步，共 {GUIDE_CARDS.length} 步</span>
          <button type="button" className="rm-guide-cards-skip" onClick={onSkip}>跳过引导</button>
        </header>
        <div className="rm-guide-cards-body">
          <div className="rm-guide-cards-icon" aria-hidden="true">{card.icon}</div>
          <h2 id="rm-guide-title" className="rm-guide-cards-title">{card.title}</h2>
          <div className="rm-guide-cards-lines">
            {card.lines.map((line) => <p key={line} className="rm-guide-cards-line">{line}</p>)}
          </div>
        </div>
        <div className="rm-guide-cards-footer">
          <div className="rm-guide-cards-dots" aria-hidden="true">
            {GUIDE_CARDS.map((_, i) => <span key={i} className={`rm-guide-cards-dot${i <= index ? " is-active" : ""}`} />)}
          </div>
          <div className="rm-guide-cards-nav">
            {index > 0 ? (
              <button type="button" className="rm-guide-cards-back" onClick={() => setIndex((i) => i - 1)}>上一步</button>
            ) : <span className="rm-guide-cards-back-placeholder" />}
            <button
              type="button"
              className="rm-guide-cards-next"
              onClick={isLast ? onComplete : () => setIndex((i) => i + 1)}
            >
              {isLast ? "开始使用" : "下一步"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export function hasSeenGuideCards(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "seen";
  } catch {
    return false;
  }
}

export function markGuideCardsSeen(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, "seen");
  } catch {}
}

