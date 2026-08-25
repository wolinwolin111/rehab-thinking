"use client";

import { useState } from "react";

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

const STORAGE_KEY = "rehabmind-guide-cards-seen";

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
    <div className="rm-entry-sheet-backdrop" role="dialog" aria-modal="true" aria-labelledby="rm-guide-title">
      <section className="rm-entry-sheet rm-guide-cards">
        <header>
          <span>第 {index + 1} 步，共 {GUIDE_CARDS.length} 步</span>
          <button type="button" className="rm-guide-skip" onClick={onSkip}>跳过引导</button>
        </header>
        <div className="rm-guide-card-body">
          <div className="rm-guide-card-icon">{card.icon}</div>
          <h2 id="rm-guide-title">{card.title}</h2>
          <div className="rm-guide-card-lines">
            {card.lines.map((line) => <p key={line}>{line}</p>)}
          </div>
        </div>
        <div className="rm-guide-card-dots">
          {GUIDE_CARDS.map((_, i) => <span key={i} className={i <= index ? "is-active" : ""} />)}
        </div>
        <footer>
          {index > 0 ? (
            <button type="button" className="rm-guide-back" onClick={() => setIndex((i) => i - 1)}>上一步</button>
          ) : <span />}
          <button
            type="button"
            className="rm-primary"
            onClick={isLast ? onComplete : () => setIndex((i) => i + 1)}
          >
            {isLast ? "开始使用" : "下一步"}
          </button>
        </footer>
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
