import { recordConflictCopy } from "@/src/features/rehabmind/components/shared/user-facing-copy";

type PilotConflictPanelProps = {
  publicCode?: string;
  localRevision: number;
  remoteRevision: number;
  changedSections: string[];
  onUseRemote: () => void;
  onSaveAsNew: () => void;
  onExportLocal: () => void;
  onLater: () => void;
};

export function PilotConflictPanel({ publicCode, localRevision, remoteRevision, changedSections, onUseRemote, onSaveAsNew, onExportLocal, onLater }: PilotConflictPanelProps) {
  const copy = recordConflictCopy(publicCode);
  return <section className="rm-pilot-conflict-panel" role="alertdialog" aria-label="案例保存冲突">
    <div>
      <strong>{copy.title}</strong>
      <p>{copy.description}</p>
      <details><summary>查看记录详情</summary><small>这台设备：第{localRevision}次保存 · 云端：第{remoteRevision}次保存</small>{changedSections.length ? <small>不同内容：{changedSections.join("、")}</small> : null}</details>
    </div>
    <div className="rm-pilot-conflict-actions">
      <button type="button" className="rm-primary" onClick={onUseRemote}>查看云端记录</button>
      <button type="button" onClick={onSaveAsNew}>另存为新案例</button>
      <button type="button" onClick={onExportLocal}>导出这台设备的记录</button>
      <button type="button" onClick={onLater}>稍后处理</button>
    </div>
  </section>;
}
