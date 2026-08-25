"use client";

import { useState } from "react";

export function PilotConsentGate({
  open,
  declined,
  onAgree,
  onDecline,
  onReconsider,
}: {
  open: boolean;
  declined: boolean;
  onAgree: () => Promise<void> | void;
  onDecline: () => void;
  onReconsider: () => void;
}) {
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!open) return null;

  return <div className="rm-entry-sheet-backdrop" role="dialog" aria-modal="true" aria-labelledby="rm-consent-title">
    <section className="rm-entry-sheet rm-consent-gate">
      {declined ? <>
        <div className="rm-consent-copy">
          <h1 id="rm-consent-title">暂未开始使用</h1>
          <p>确认数据使用方式后，才能创建匿名案例并进入康复流程。</p>
        </div>
        <footer><button type="button" className="rm-primary" onClick={onReconsider}>重新查看说明</button></footer>
      </> : <>
        <header><span>数据使用说明</span><h1 id="rm-consent-title">开始前，请确认数据使用方式</h1></header>
        <ul className="rm-consent-points">
          <li>康复内容会使用匿名案例编号保存</li>
          <li>不需要填写姓名、手机号等身份信息</li>
          <li>你可以在应用内删除案例</li>
          <li>评估和处理由你根据提示自行判断和执行，缺少康复师的实时把关，效果因人而异</li>
          <li>多次康复改善不明显时建议寻求线下康复师帮助</li>
        </ul>
        <details className="rm-consent-details">
          <summary>查看完整说明</summary>
          <p>你的问题描述和康复记录会保存到悦舒运动康复使用的服务器，以便恢复进度、关联问题反馈并改进产品。</p>
          <p>案例不关联登录账号，请不要在问题描述或反馈中填写真实姓名、手机号等可以识别身份的信息。</p>
        </details>
        <label className="rm-consent-check">
          <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} data-rehabmind-tutorial="consent-checkbox" />
          <span>我已了解并同意以上内容</span>
        </label>
        {error ? <p className="rm-consent-error" role="alert">{error}</p> : null}
        <footer>
          <button type="button" onClick={onDecline} disabled={busy}>暂不使用</button>
          <button
            type="button"
            className="rm-primary"
            disabled={!agreed || busy}
            data-rehabmind-tutorial="consent-agree"
            onClick={() => {
              setBusy(true);
              setError("");
              Promise.resolve(onAgree())
                .catch(() => setError("匿名案例创建失败，请检查网络后重试。"))
                .finally(() => setBusy(false));
            }}
          >{busy ? "正在创建" : "同意并创建案例"}</button>
        </footer>
      </>}
    </section>
  </div>;
}
