# RehabMind 测试知会：移动端体验整改第 1 批（UI/文案，2026-09-02）

## 范围：dev 分支 agent/dev-20260901（基线 `138e2b1`，本批 = 本提交）

| # | SHA | 说明 |
|---|---|---|
| 1 | `138e2b1` | fix(treatment): C1 哨兵统一 + K-P0-06 出处注释（上一批） |
| 2 | 本提交 | feat(ui): 移动端体验整改第 1 批（A-1/A-2/A-2b/B-1~B-5） |

## 本批内容（详见 development-to-test-mobile-ui-batch1-2026-09-02.md）

- A-1 转介卡次级按钮改中性描边（原白字浅底不可见）。
- A-2 修"点做过手术清空上方已选"：`applyIntakeChange` 加 `preserveConfirmation`，手术三题不再重置安全/影像答案。
- A-2b 手术问题答完折叠为一行"已确认…"+修改。
- B-1 顶栏 RM → `public/logo-mark.png`（桌面+引导页两处）。
- B-2 案例编号提示：OnceHint 加 `autoDismissMs`（3.2s 自动消失）+ 移动端子元素悬浮 fixed（父容器保持 static）。
- B-3 移动端首屏提示换行 + 部位 chips 收紧（纯 CSS，保留契约钉住的文本串）。
- B-4 补问文案精简（"先补最关键的几项"、"先选一个大部位，可标记多个位置"）。
- B-5 ChiefOutcomeSummary 三态：真复查没变/本次未单独复查/变轻。

## 契约影响

- 刻意 0 破坏 QA 源码契约：stash 对比全量 `tests/unit tests/workflow tests/component` 失败集合与基线一致（47 条预存红，本批 0 新增）。
- 唯一需测试侧同步：**B-5** 若曾钉旧标题"主诉动作已复查"，需按三态更新（本次未测→"主诉动作本次未单独复查"）。

## 验证

typecheck 干净；eslint 改动文件 0 error（1 条 `<img>` warning 与既有风格一致）；浏览器实测顶栏 LOGO 正常加载、无 "RM" 残留。

## 第 2 批预告（未做）

踝区下台阶项、自定义动作复现项(a′)、功能分问法(C-2)、A-3 对应主诉——知识/评估合同层，单开。
