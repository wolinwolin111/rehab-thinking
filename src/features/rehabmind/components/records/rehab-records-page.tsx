"use client";

import { OnceHint } from "@/src/features/rehabmind/components/shared/once-hint";
import type { SavedDemoRecord } from "@/src/features/rehabmind/components/workbench/workbench-support";

function SessionRows({ record }: { record: SavedDemoRecord }) {
  if (!record.sessionHistory?.length) {
    return <div className="rm-record-session-row"><span>第{record.sessionCount || 1}次康复</span><b>进行中</b></div>;
  }
  return <div className="rm-record-session-rows">{[...record.sessionHistory].reverse().map((session) => <div className="rm-record-session-row" key={session.sessionNumber}>
    <span>第{session.sessionNumber}次康复</span>
    <b>{typeof session.startedScore === "number" && typeof session.endingScore === "number"
      ? `${session.startedScore} → ${session.endingScore}`
      : typeof session.endingScore === "number" ? `${session.endingScore}/10` : "已记录"}</b>
  </div>)}</div>;
}

export function RehabRecordsPage({
  open,
  records,
  showFirstOpenHint,
  onBack,
  onCopyCaseCode,
  onRestore,
  onDelete,
  onCreate,
  onClear,
}: {
  open: boolean;
  records: SavedDemoRecord[];
  showFirstOpenHint: boolean;
  onBack: () => void;
  onCopyCaseCode: (record: SavedDemoRecord) => void;
  onRestore: (record: SavedDemoRecord) => void;
  onDelete: (record: SavedDemoRecord) => void;
  onCreate: () => void;
  onClear: () => void;
}) {
  if (!open) return null;
  return <section className="rm-records-page" aria-label="康复记录">
    <header className="rm-records-page-header">
      <button type="button" onClick={onBack}>返回</button>
      <div><span>联网时同步到服务器</span><h2>康复记录</h2></div>
    </header>
    <main>
      <OnceHint id="records-open" active={showFirstOpenHint}>这里可以查看以前的恢复情况。</OnceHint>
      {records.length ? <div className="rm-record-case-list">{records.map((record) => <article key={record.id} className="rm-record-case">
        <header>
          <div><span>案例编号</span><b>{record.pilotPublicCode ?? "历史本机记录"}</b></div>
          {record.pilotPublicCode ? <button type="button" onClick={() => onCopyCaseCode(record)}>复制</button> : null}
        </header>
        <section className="rm-record-case-summary">
          <span>{record.status} · 已记录 {record.sessionHistory?.length || record.sessionCount} 次</span>
          <strong>{record.complaint}</strong>
          <small>{record.region} · 恢复目标：{record.goal}</small>
        </section>
        <SessionRows record={record} />
        <footer>
          <button type="button" className="rm-record-continue" disabled={!record.snapshot} onClick={() => onRestore(record)}>{record.status === "等待影像" ? "补充影像" : "继续康复"}</button>
          <button type="button" className="rm-record-delete" onClick={() => onDelete(record)}>删除案例</button>
        </footer>
      </article>)}</div> : <section className="rm-record-empty"><strong>还没有康复记录</strong><p>创建案例后，可以从这里继续康复并查看每次恢复情况。</p></section>}
    </main>
    <footer className="rm-records-page-actions">
      <button type="button" onClick={onCreate}>新建案例</button>
      <button type="button" disabled={!records.length} onClick={onClear}>清空本机记录</button>
    </footer>
  </section>;
}
