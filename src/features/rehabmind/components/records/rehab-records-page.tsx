"use client";

import { OnceHint } from "@/src/features/rehabmind/components/shared/once-hint";
import type { SavedDemoRecord } from "@/src/features/rehabmind/components/workbench/workbench-support";
import type { ProblemThreadRecord, SessionIndexRecord } from "@/src/domain/rehab/history/session-identity-core";
import type { RehabSessionSummary } from "@/src/features/rehabmind/workflow/session-history";

function SessionRows({ record }: { record: SavedDemoRecord }) {
  if (!record.sessionHistory?.length) {
    return <div className="rm-record-session-row"><span>第{record.sessionCount || 1}次康复</span><b>{record.sessionStatus === "draft" ? "草稿" : "进行中"}</b></div>;
  }
  return <div className="rm-record-session-rows">{[...record.sessionHistory].reverse().map((session) => <div className="rm-record-session-row" key={session.sessionId ?? session.sessionNumber}>
    <span>第{session.sessionNumber}次康复</span>
    <b>{session.status === "draft" ? "草稿" : typeof session.startedScore === "number" && typeof session.endingScore === "number"
      ? `${session.startedScore} → ${session.endingScore}`
      : typeof session.endingScore === "number" ? `${session.endingScore}/10` : "已记录"}</b>
  </div>)}</div>;
}

function threadStatusLabel(status: ProblemThreadRecord["status"]) {
  if (status === "archived") return "以前的问题";
  if (status === "resolved") return "已解决";
  if (status === "superseded") return "后来记录了新的问题";
  return "当前问题";
}

function sessionLabel(session: SessionIndexRecord, summary?: RehabSessionSummary) {
  const endingScore = summary?.endingScore;
  const score = typeof summary?.startedScore === "number" && typeof endingScore === "number"
    ? `${summary.startedScore} → ${endingScore}`
    : typeof endingScore === "number" ? `${endingScore}/10` : session.status === "draft" ? "草稿" : "已记录";
  return `第${session.sessionNumber}次康复 · ${score}`;
}

function ThreadRows({ record }: { record: SavedDemoRecord }) {
  const threads = record.problemThreads ?? record.snapshot?.problemThreads ?? [];
  const index = record.sessionIndex ?? record.snapshot?.sessionIndex ?? [];
  if (!threads.length) return <SessionRows record={record} />;
  return <div className="rm-record-thread-rows">{threads.map((thread) => {
    const threadSessions = index
      .filter((session) => session.problemThreadId === thread.problemThreadId)
      .sort((left, right) => right.sessionNumber - left.sessionNumber);
    const summaries = (record.sessionHistory ?? []).filter((summary) => !summary.problemThreadId || summary.problemThreadId === thread.problemThreadId);
    const rows = threadSessions.length
      ? threadSessions
      : summaries.map((summary) => ({
          sessionId: summary.sessionId ?? `legacy-${summary.sessionNumber}`,
          problemThreadId: thread.problemThreadId,
          caseId: thread.caseId,
          sessionNumber: summary.sessionNumber,
          status: summary.status ?? (summary.completedAt ? "completed" : "draft"),
          startedAt: summary.startedAt ?? summary.completedAt ?? "",
          completedAt: summary.completedAt,
        } satisfies SessionIndexRecord));
    return <section className="rm-record-thread" key={thread.problemThreadId}>
      <header><div><span>{threadStatusLabel(thread.status)}</span><strong>{thread.title ?? thread.location ?? "康复问题"}</strong></div><small>{thread.location ?? "未记录位置"}</small></header>
      {rows.length ? <div className="rm-record-session-rows">{rows.map((session) => {
        const summary = summaries.find((item) => item.sessionId === session.sessionId || item.sessionNumber === session.sessionNumber);
        return <div className="rm-record-session-row" key={session.sessionId}><span>{sessionLabel(session, summary)}</span><b>{session.status === "draft" ? "草稿" : session.status === "abandoned" ? "已放弃" : session.completedAt ? "已完成" : "已记录"}</b></div>;
      })}</div> : <p>这个问题还没有康复记录。</p>}
    </section>;
  })}</div>;
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
      <div><span>联网后自动同步</span><h2>康复记录</h2></div>
    </header>
    <main>
      <OnceHint id="records-open" active={showFirstOpenHint}>这里可以查看以前的恢复情况。</OnceHint>
      {records.length ? <div className="rm-record-case-list">{records.map((record) => <article key={record.id} className="rm-record-case">
        <header>
          <div><span>案例编号</span><b>{record.pilotPublicCode ?? "历史本机记录"}</b></div>
          {record.pilotPublicCode ? <button type="button" onClick={() => onCopyCaseCode(record)}>复制</button> : null}
        </header>
        <section className="rm-record-case-summary">
          <span>{record.sessionStatus === "draft" ? "草稿" : record.status} · 已记录 {(record.sessionIndex ?? record.snapshot?.sessionIndex)?.filter((session) => session.status === "completed").length || record.sessionHistory?.length || record.sessionCount} 次</span>
          <strong>{record.complaint}</strong>
          <small>{record.region} · 恢复目标：{record.goal}</small>
        </section>
        <ThreadRows record={record} />
        <footer>
          <button type="button" className="rm-record-continue" disabled={!record.snapshot} onClick={() => onRestore(record)}>{record.sessionStatus === "draft" ? "继续草稿" : record.status === "等待影像" ? "补充影像" : "继续康复"}</button>
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
