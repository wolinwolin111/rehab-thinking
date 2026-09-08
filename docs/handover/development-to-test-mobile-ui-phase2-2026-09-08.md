# 手机端 UI 二期整改交接报告（阶段 A–G）

> 日期：2026-09-08｜依据：`mobile-ui-remediation-phase2-execution-plan-2026-09-08.md`
> 执行：开发会话（自评估模式，按方案 §14/§15 硬判据 + DOM 测量；模型无视觉输入，"看起来"类判定以测量数据与规则审计替代，截图集在 `outputs/mobile-phase2/` 供人工抽查）
> 提交链：`96915f6`（phase-1 基线 checkpoint）→ `c27e85a`（B 合同）→ `f50e049`（C+D）→ `f584f41`（E+F）→ `d0e21d1`（窄屏/横屏/溢出修正）

### 已完成

- **动作合同**：49 个容器（48 个由脚本标注＋guided-nav 手改）全部有 `data-action-layout`；每个底栏按钮有 `data-action-role`；逐分支检查每个可见动作区最多一个 primary（three 布局最后一个非 primary 自动 tertiary，语义与 §10.4 核对表逐条对齐：补充/查看=secondary、保存/退出=tertiary、临床推进=primary）。
- **CSS**：固定底栏收敛为 1 个权威区块（portrait）＋ landscape 必要框定（media 边界所迫，见"未决"）；删除 2 处 `disabled::after` 伪文案；4 处 `min-height: var(--rm-mobile-action-height)` 自引用清零；`complete-demo.css:1399` first-child order 收窄到非 v2；safe-area 双算清零。
- **测量**：只取"可见且 position:fixed"的栏；同值不写；无栏写 0px；MutationObserver 逻辑保留。
- **页面**：第 1 步双操作区合并（末题主按钮原位替换为"进入关键确认"，正文不再出现第二套动作；全信息模式保留正文入口）；训练 gate 用 `aria-describedby` 关联；抽屉打开滚动锁（`body.rm-dialog-open`）；第 3 步长标题 `min-width:0+flex:1+overflow-wrap:anywhere`；第 5 步 `dl` 88px 窄列改单列堆叠；第 6 步 session-hero 深蓝渐变改浅色卡＋4px 语义条。
- **溢出修复（后态实测发现）**：解剖图谱 SVG 在 320 顶宽 → workspace `overflow-x:clip`＋图谱内部滚动；320 三按钮超预算 → ≤359 行高压到 44px 触摸下限（仍 ≥ 44 要求）。

### 关键实测（改后，Playwright 真实渲染测量）

| 场景 | 视口 | 底栏高度 | 横向溢出 | 前态对照 | 结果 |
|---|---:|---:|---:|---:|---|
| 第 4 步三按钮（本阶段成果） | 390×844 | 120px | 0 | 179px | 通过 |
| 第 4 步三按钮 | 320×568 | 111px | 0 | （前态未采到，§4 记录≈179） | 通过 |
| 第 5 步三按钮（训练） | 390×844 | 120px | 0 | 193px | 通过 |
| 第 5 步三按钮 | 320×568 | 119px | 0 | — | 通过 |
| split 双按钮 | 390 | 69–70px（一行） | 0 | 74px | 通过 |
| split 双按钮 | 320 | 113–114px（两行，主在下） | 0 | — | 通过 |
| 横屏三按钮 | 844×390 | 63px（一行，P 右） | 0 | — | 通过 |
| 200% 缩放（zoom=2） | 390/320 | 159/226px 自然增高 | 0 | — | 无截断 clipped=false |
| 第 1 步双操作区 | 390 | 单栏（导航栏原位换"进入关键确认"） | 0 | 前态 74px+正文按钮 | 通过 |
| actionVar vs railHeight | 全部 | 取整后一致 | — | — | 通过 |

### 自动化

- typecheck：通过；build：通过；`git diff --check`：通过
- check:structure / check:catalog / check:boundaries：绿（boundaries 仅第 32 轮登记的 5 条预存 import-type，零新增）；check:docs：4 条缺失均为 B 类已登记死链（其中 quality/register 2＋flow-audit 2，与本批无关）
- `tests/component/mobile-app-shell-contract.test.mjs`：4/4 通过
- node 套件（dev 树副本）失败集合 60→59：唯一差异是一条原失败项转通过（旧副本源码钉 `<span>本次记录</span>` 被 phase-1 的标记注释满足）；**零新增失败**
- `test:browser:mobile-preview`：未在本会话执行（需测试侧 Playwright project 编排与注册）；以自研驱动脚本等价走查代替，脚本存 `outputs/mobile-phase2/capture-driver.mjs` 供复用

### 测试树断言核对（B 类只读检查）

`进入关键确认`（按钮名未变仅换位）、`.rm-page-actions.three`（类名保留）、`还需补充`（专业 footer/正文 span 原文保留）、`professional-branch 不含 rm-guided-nav`（未违反）——**预期零解钉**；如合并后 rendered-html 有源码字符串钉意外红，按往来规矩登记。

### 文件

- 修改：`mobile-patient.css`、`complete-demo.css`（仅 :1399 收窄）、六个 stage 组件（仅动作属性/aria/文案位置）、`rehabmind-workbench.tsx`（仅测量 effect）、`use-dialog-accessibility.ts`（滚动锁）、`mobile-app-navigation.tsx`（nav 属性）
- 未修改受保护文件：tests/**、docs/quality/**、release.generated.ts、artifacts/**

### 已知限制与未决

1. **landscape 的固定框定必须在 landscape media 重复一次**（权威区块在 ≤720 media 内，844 宽不命中）——是"每媒体只写差异"的例外，已注释说明。
2. §6.3 推荐的 DOM 物理重排（S→T→P）未做：role 驱动 CSS 已保证视觉合同恒定，移动多行回调节点的风险大于收益；条件分支槽位（三元内按钮）物理重排本就不安全。
3. 软键盘/visualViewport 与 iOS 焦点行为未自动验证（§11.3），留给 mobile-preview 套件；输入框 16px 防放大已由 phase-1 :271 规则保证。
4. 125% 档未单独测（200% 覆盖最坏情况）。
5. 抽屉"关闭后底栏不需刷新即恢复"已由 z-index 层级（250>120）＋滚动锁类名切换保证，未做交互级自动断言。
6. §14.1 的 360/412/430 三档未单独采集（320/390 为两端包络，三档布局同属两媒体区间，风险低）。

### 前后截图

`outputs/mobile-phase2/before/{320x568,390x844}`（基线冻结于实现前 HEAD 运行）与 `after/{320x568,390x844,844x390}`（含 zoom200 帧）。320 前态的三按钮/总结帧因驱动超时缺失，前态数值以方案 §4 记录＋390 实测（179/193px）为证。
