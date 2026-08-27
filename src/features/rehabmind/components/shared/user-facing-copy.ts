/**
 * 正式用户界面共用文案。
 *
 * 这里只描述用户看到的结果和下一步，不暴露存储、同步或工作流实现细节。
 */
export const FUNCTION_COMPLETION_RETEST_COPY = Object.freeze({
  title: "现在再试一次这个动作",
  description: "上次没有做完，这次只需要确认现在能不能完成。",
});

export function scoreBeforeContext(score: number) {
  return `处理前 ${score}/10`;
}

export function localSaveFailureCopy(storageBlocked: boolean) {
  return storageBlocked
    ? "当前记录没有保存成功，请检查浏览器的存储权限"
    : "这台设备的存储空间不足，请先删除或导出旧记录";
}

export function recordConflictCopy(publicCode?: string) {
  return {
    title: "这台设备和云端都有新的修改",
    description: `${publicCode ? `案例 ${publicCode} 的` : ""}两份记录都已保留。请选择继续查看哪一份。`,
  };
}
