type PilotConflictPanelProps = {
  publicCode?: string;
  localRevision: number;
  remoteRevision: number;
  onUseRemote: () => void;
  onExportLocal: () => void;
  onLater: () => void;
};

export function PilotConflictPanel({ publicCode, localRevision, remoteRevision, onUseRemote, onExportLocal, onLater }: PilotConflictPanelProps) {
  return <section className="rm-pilot-conflict-panel" role="alertdialog" aria-label="案例保存冲突">
    <div>
      <strong>本机和服务器都有更新</strong>
      <p>{publicCode ? `案例 ${publicCode} 的本机版本和服务器版本不一致。` : "这个案例的本机版本和服务器版本不一致。"} 当前未覆盖任一版本。</p>
      <small>本机基于第{localRevision}版 · 服务器第{remoteRevision}版</small>
    </div>
    <div className="rm-pilot-conflict-actions">
      <button type="button" className="rm-primary" onClick={onUseRemote}>查看服务器版本</button>
      <button type="button" onClick={onExportLocal}>导出本机版本</button>
      <button type="button" onClick={onLater}>稍后处理</button>
    </div>
  </section>;
}
