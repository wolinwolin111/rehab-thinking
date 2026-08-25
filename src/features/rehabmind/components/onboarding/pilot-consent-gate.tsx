"use client";

import { useState } from "react";

export function PilotConsentGate({
  open,
  onAgree,
  onDecline,
}: {
  open: boolean;
  onAgree: () => void;
  onDecline: () => void;
}) {
  const [agreed, setAgreed] = useState(false);
  if (!open) return null;

  return (
    <div
      className="rm-focus-onboarding is-unanchored"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rm-consent-title"
    >
      <div className="rm-focus-dim" aria-hidden="true" />
      <section
        className="rm-focus-tooltip is-bottom is-unanchored"
        style={{ left: "50%", top: "50%", width: "min(520px, calc(100vw - 32px))", transform: "translate(-50%, -50%)" }}
      >
        <header className="rm-focus-header">
          <div><span>开始前请阅读</span></div>
        </header>
        <div className="rm-focus-copy">
          <h1 id="rm-consent-title">试用知情同意</h1>
          <p>
            你的症状描述和康复记录会上传到开发者服务器，以匿名案例编号保存、不关联任何账号，
            仅用于改进本产品和提供使用支持。
            <strong>请勿填写真实姓名、手机号等能识别你身份的信息。</strong>
          </p>
          <p>你可随时在应用内删除案例；试用结束后，服务器数据将全部清除。</p>
        </div>
        <label style={{ display: "flex", gap: 8, alignItems: "flex-start", margin: "12px 0", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={agreed}
            onChange={(event) => setAgreed(event.target.checked)}
            data-rehabmind-tutorial="consent-checkbox"
            style={{ marginTop: 3, width: 16, height: 16, flexShrink: 0 }}
          />
          <span>我已阅读并同意以上条款</span>
        </label>
        <footer className="rm-focus-footer">
          <button type="button" className="rm-focus-back" onClick={onDecline}>
            暂不同意（仅保存在本机）
          </button>
          <button
            type="button"
            className="rm-primary rm-focus-next"
            onClick={onAgree}
            disabled={!agreed}
            data-rehabmind-tutorial="consent-agree"
          >
            同意并继续
          </button>
        </footer>
      </section>
    </div>
  );
}
