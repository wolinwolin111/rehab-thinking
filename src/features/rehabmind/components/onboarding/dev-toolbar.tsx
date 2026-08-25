"use client";

import { useState } from "react";

const STEPS = ["症状信息", "关键确认", "评估检查", "处理复测", "训练居家", "康复总结"];

export function DevToolbar({
  onReset,
  onClearAll,
  onJumpToStep,
}: {
  onReset: () => void;
  onClearAll: () => void;
  onJumpToStep: (step: 0 | 1 | 2 | 3 | 4 | 5) => void;
}) {
  const [open, setOpen] = useState(false);
  if (process.env.NODE_ENV !== "development") return null;

  return (
    <div style={{ position: "fixed", bottom: 8, left: 8, zIndex: 9999 }}>
      {open ? (
        <div style={{ background: "#1a1a2e", color: "#e0e0e0", borderRadius: 8, padding: 12, fontSize: 12, fontFamily: "monospace", maxWidth: 220, boxShadow: "0 4px 16px rgba(0,0,0,.4)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <strong>🛠 Dev Tools</strong>
            <button type="button" onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 14 }}>✕</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <button type="button" onClick={onReset} style={btn}>↻ 重置流程（清草稿）</button>
            <button type="button" onClick={onClearAll} style={{ ...btn, color: "#ff6b6b" }}>🗑 清除全部本机数据</button>
            <div style={{ marginTop: 4, color: "#888" }}>跳到阶段：</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {STEPS.map((label, i) => (
                <button key={label} type="button" onClick={() => onJumpToStep(i as 0 | 1 | 2 | 3 | 4 | 5)} style={{ ...btn, padding: "3px 8px", fontSize: 11 }}>
                  {i + 1}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 4, color: "#888" }}>快捷入口：</div>
            <a href="/test" style={{ ...btn, textDecoration: "none", textAlign: "center" }}>🧪 测试工作台</a>
            <a href="/decision-lab" style={{ ...btn, textDecoration: "none", textAlign: "center" }}>🔬 决策实验室</a>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{ background: "#1a1a2e", color: "#e0e0e0", border: "1px solid #333", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontFamily: "monospace", cursor: "pointer", opacity: 0.6 }}
        >
          🛠
        </button>
      )}
    </div>
  );
}

const btn: React.CSSProperties = {
  background: "#2a2a4e",
  color: "#c0c0c0",
  border: "1px solid #444",
  borderRadius: 4,
  padding: "5px 10px",
  fontSize: 12,
  cursor: "pointer",
  textAlign: "left",
};
