"use client";

import type { PilotSyncDisplayState, SavedDemoRecord, Step } from "@/src/features/rehabmind/components/workbench/workbench-support";
import { STEPS } from "@/src/features/rehabmind/components/workbench/workbench-support";
import { useDialogAccessibility } from "@/src/features/rehabmind/components/shared/use-dialog-accessibility";
import { mobileSaveStatus, mobileStageAvailable } from "./mobile-navigation-core";

export function MobileTopActions({
  sessionNumber,
  syncState,
  moreOpen,
  onToggleMore,
}: {
  sessionNumber: number;
  syncState: PilotSyncDisplayState;
  moreOpen: boolean;
  onToggleMore: () => void;
}) {
  const saveStatus = mobileSaveStatus(syncState);
  return <div className="rm-mobile-top-actions">
    <span aria-live="polite">第{sessionNumber}次{saveStatus ? ` · ${saveStatus}` : ""}</span>
    <button type="button" aria-label="更多" aria-expanded={moreOpen} onClick={onToggleMore}>⋮</button>
  </div>;
}

export function MobileStageNavigation({
  open,
  railStep,
  currentStep,
  maxUnlocked,
  followupMode,
  onOpen,
  onClose,
  onSelect,
}: {
  open: boolean;
  railStep: Step;
  currentStep: Step;
  maxUnlocked: Step;
  followupMode: boolean;
  onOpen: () => void;
  onClose: () => void;
  onSelect: (step: Step) => void;
}) {
  const drawerRef = useDialogAccessibility({ open, onClose });
  return <>
    <section className="rm-mobile-stagebar" data-rehabmind-tutorial="flow-mobile">
      <button type="button" onClick={onOpen}>
        <span>{railStep + 1}/6&nbsp; {STEPS[railStep]}</span>
        <b>查看阶段</b>
      </button>
      <i aria-hidden="true"><em style={{ width: `${((railStep + 1) / STEPS.length) * 100}%` }} /></i>
    </section>
    {open ? <div className="rm-mobile-drawer-backdrop" onMouseDown={onClose}>
      <section ref={drawerRef} className="rm-mobile-stage-drawer" role="dialog" aria-modal="true" aria-label="本次康复阶段" tabIndex={-1} onMouseDown={(event) => event.stopPropagation()}>
        <header><h2>本次康复</h2><button type="button" onClick={onClose}>关闭</button></header>
        <nav>{STEPS.map((label, index) => {
          const available = mobileStageAvailable({ targetStep: index as Step, railStep, currentStep, maxUnlocked, followupMode });
          return <button
            type="button"
            key={label}
            disabled={!available}
            className={index === railStep ? "is-current" : index < railStep ? "is-done" : ""}
            onClick={() => onSelect(index as Step)}
          >
            <i>{index < railStep ? "✓" : index + 1}</i>
            <span>{label}</span>
            <b>{index === railStep ? "当前" : index < railStep ? "可回看" : available ? "可进入" : "未开始"}</b>
          </button>;
        })}</nav>
      </section>
    </div> : null}
  </>;
}

export function MobileMoreMenu({
  open,
  sessionNumber,
  record,
  onClose,
  onCopyCaseCode,
  onOpenRecords,
  onOpenFeedback,
  onOpenHelp,
  onSave,
}: {
  open: boolean;
  sessionNumber: number;
  record: SavedDemoRecord | undefined;
  onClose: () => void;
  onCopyCaseCode: (record: SavedDemoRecord) => void;
  onOpenRecords: () => void;
  onOpenFeedback: () => void;
  onOpenHelp: () => void;
  onSave: () => void;
}) {
  const drawerRef = useDialogAccessibility({ open, onClose });
  if (!open) return null;
  return <div className="rm-mobile-drawer-backdrop" onMouseDown={onClose}>
    <section ref={drawerRef} className="rm-mobile-more-drawer" role="dialog" aria-modal="true" aria-label="更多操作" tabIndex={-1} onMouseDown={(event) => event.stopPropagation()}>
      <header><div><span>第{sessionNumber}次康复</span><h2>更多</h2></div><button type="button" onClick={onClose}>关闭</button></header>
      {record?.pilotPublicCode ? <section className="rm-mobile-case-code">
        <span>案例编号</span><b>{record.pilotPublicCode}</b><button type="button" onClick={() => onCopyCaseCode(record)}>复制</button>
      </section> : null}
      <nav>
        <button type="button" onClick={onOpenRecords}>康复记录</button>
        <button type="button" onClick={onOpenFeedback}>问题反馈</button>
        <button type="button" onClick={onOpenHelp}>关于 RehabMind</button>
        <button type="button" onClick={onSave}>保存本次记录</button>
      </nav>
      {record?.pilotVersions ? <small className="rm-mobile-version">版本 {record.pilotVersions.appVersion}</small> : null}
    </section>
  </div>;
}
