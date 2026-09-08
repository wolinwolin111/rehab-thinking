# 患者手机端 UI 二期整改执行方案

> 日期：2026-09-08  
> 适用仓库：`D:\Study\codex\project\rehab-thinking-demo`  
> 目标读者：接手实现的开发者或语言模型  
> 本文性质：施工指令，不是新的产品/临床规则真源  
> 当前结论：现有手机端已经可走通，但视觉与交互尚未达到验收标准；尤其是固定底部操作区，必须完成本方案后再做视觉验收。

## 0. 给执行模型的最短指令

如果你是接手此任务的模型，严格按以下顺序工作，不要跳步：

1. 先阅读本方案全文，再阅读 `docs/README.md`、`docs/system/01-product-design.md`、`02-decision-framework.md`、`05-session-orchestration.md`、`06-data-and-persistence.md`、`07-architecture-boundaries.md`、`11-engineering-workflow.md`。
2. 运行 `git status --short`，保留现有未提交改动；不得 reset、checkout 或覆盖用户改动。
3. 只改本文“允许修改”列表中的表现层文件；不要顺手重构业务逻辑。
4. 先建立统一的动作角色合同，再改 CSS；禁止先在 CSS 文件末尾追加覆盖规则。
5. 逐页处理第 1–6 步，每处理一页就做 320px、390px 和横屏检查。
6. 运行静态检查、组件合同检查和真实浏览器预览。
7. 必须保存人工截图并逐项比对本文验收矩阵。测试全绿但页面仍有奇怪按钮，不算完成。

## 1. 背景和设计判断

本产品的主要患者用户使用手机完成症状录入、安全确认、动作检查、处理复测、训练反馈和记录保存。手机端不是桌面界面的缩小版，而是一个“当前任务优先”的逐步操作界面。

本轮继续采用以下视觉方向：

- 主体是安静、可信的靛紫浅色任务表面，不使用大面积高饱和渐变。
- 薄荷色只表示改善、已完成或可以继续的积极信号。
- 琥珀色只表示谨慎、等待确认或没有明显变化。
- 红色只表示停止、加重、转介或真正的危险信息，不用来装饰普通按钮。
- 每屏只允许一个最明确的下一步；次要动作不得和主操作争夺视觉重量。
- 产品的独特视觉特征是“康复进程的连续任务轨道”：顶部显示当前位置，底部只承载当前可执行动作，中间内容按任务顺序阅读。

这轮不再扩大视觉风格，而是把已有风格做精确：统一按钮角色、间距、信息密度、换行和响应式行为。

## 2. 目标、非目标与完成结果

### 2.1 目标

完成后应满足：

1. 320–430px 宽手机上，第 1–6 步均无页面级横向溢出。
2. 固定底栏只有一个动作系统，按钮顺序在所有页面稳定。
3. 三按钮底栏在默认字号下只占两行，内容高度不超过 120px，不再纵向堆成三行。
4. 主按钮总是在视觉阅读路径的最后：横向时在右侧，纵向时在最底部。
5. 禁用按钮不再被统一追加错误文案，禁用原因由页面显式说明。
6. 第 1 步不再同时出现正文主操作和底部返回按钮两套操作区。
7. 长中文标题、训练说明和总结卡在 320px 下自然换行，不出现孤字、窄列和异常挤压。
8. 抽屉、弹窗、软键盘、安全区、大字号、横屏均可正常使用。
9. 桌面端行为和患者业务流程不变。

### 2.2 非目标

本轮不做：

- 不改变六步流程、页面跳转条件和导航锁定规则。
- 不改主诉解析、安全规则、评估队列、候选排序、复测结论、训练进退阶或剂量。
- 不改变任何保存状态文字背后的真实业务含义。
- 不改快照结构、IndexedDB、API、同步状态、案例/会话身份。
- 不重做品牌 Logo，不引入新的图片生成资产。
- 不重构为全新的组件库，不迁移 CSS 框架。
- 不修改专业端桌面布局，除非是移除明确只影响患者 v2 手机端的冲突规则。
- 不以 Android WebView 为本轮交付；网页验收后再构建壳。

### 2.3 最终交付物

实现者需要交付：

1. 表现层代码改动。
2. 一份逐文件变更摘要。
3. 一份测试结果摘要。
4. 第 1–6 步在 320×568 和 390×844 的关键截图。
5. 至少一组 844×390 横屏截图。
6. 三按钮底栏的像素高度测量记录。
7. 已知未处理问题列表；若没有则明确写“无”。

## 3. 不可越过的业务与文件边界

### 3.1 绝对不能修改的文件

- `tests/**`
- `docs/quality/**`
- `src/infrastructure/pilot/release/release.generated.ts`
- `artifacts/**`
- `scripts/quality/inspect-local.mjs`
- `docs/handover/test-session-handoff-*`

上述为测试侧 B 类文件。即使某个字符串断言因页面标记变化而失败，也不能自行修改测试来“适配”。应在交付摘要中记录断言影响，交由测试侧处理。

### 3.2 绝对不能改变的业务事实

- 安全分流优先级、停止条件、医学转介条件。
- 评估必填条件、双侧记录完整性、复测门禁。
- 候选生成、排序、执行资格和处理队列推进。
- 训练进退阶、一次退阶限制、加重历史追加规则。
- 训练剂量、动作内容、处理内容和专业术语的临床含义。
- 上游修改导致下游失效的规则。
- 空队列、未改善、加重等状态的业务语义。

### 3.3 本轮允许修改的文件

主要文件：

- `src/features/rehabmind/styles/mobile-patient.css`
- `src/features/rehabmind/styles/complete-demo.css`，仅处理已确认的旧移动端顺序冲突
- `src/features/rehabmind/components/workbench/rehabmind-workbench.tsx`，仅处理底栏测量与表现层属性
- `src/features/rehabmind/components/stages/symptom-stage.tsx`
- `src/features/rehabmind/components/stages/confirmation-stage.tsx`
- `src/features/rehabmind/components/stages/assessment-stage.tsx`
- `src/features/rehabmind/components/stages/treatment-retest-stage.tsx`
- `src/features/rehabmind/components/stages/training-stage.tsx`
- `src/features/rehabmind/components/stages/summary-stage.tsx`

如确有需要可以小范围修改：

- `src/features/rehabmind/components/navigation/mobile-app-navigation.tsx`
- `src/features/rehabmind/components/shared/ui-primitives.tsx`
- `app/layout.tsx`

这些文件当前已经存在未提交修改。实现者必须基于现状增量编辑，不能把它们恢复到 `HEAD`。

## 4. 当前问题证据矩阵

| 编号 | 现象 | 当前证据 | 影响 | 验收优先级 |
|---|---|---|---|---|
| M-01 | 第 4、5 步三按钮在 320×568 下堆成三行 | `mobile-patient.css` 的 `.three` 多处定义为单列；实测底栏约 179px | 遮挡正文，占屏高约 31.5% | P0 |
| M-02 | 旧 CSS 按第一个子元素重排按钮 | `complete-demo.css:1399` 的 `button:first-child { order: 3; }` | DOM 稍变就打乱顺序 | P0 |
| M-03 | 页面之间的主按钮位置不一致 | 第 2 步术后出口主按钮在前；第 4 步部分三按钮主操作在中间；第 6 步保存位置不一致 | 用户不能形成肌肉记忆 | P0 |
| M-04 | 所有禁用按钮被追加“· 还需补充” | `mobile-patient.css:198`、`:235` | 文案与实际状态矛盾 | P0 |
| M-05 | 第 1 步有两套操作区 | `symptom-stage.tsx` 的 `.rm-guided-nav` 与 `.rm-intake-actions` | 正文主操作与底部返回分裂 | P0 |
| M-06 | 底栏测量变量反向参与底栏最小高度 | `rehabmind-workbench.tsx:6793–6819` 与 CSS 多处 `min-height: var(--rm-mobile-action-height)` | 存在自测量放大反馈风险 | P0 |
| M-07 | 第 3 步长检查名出现末字孤行 | 检查卡头部图标、标题和其他内容共同挤压 | 阅读不稳，像排版错误 | P1 |
| M-08 | 第 5 步“为什么练这个”列过窄 | `.rm-exercise-detail dl > div` 继承桌面 `88px 1fr` | 标签/箭头/内容生硬换行 | P1 |
| M-09 | 第 6 步深蓝渐变总结卡过重 | `.rm-session-hero` 当前视觉权重高于任务内容 | 与浅色患者端不统一 | P1 |
| M-10 | 固定底栏规则重复定义 | `mobile-patient.css` 约 164、418、997、1031 行附近反复定义 | 修改靠覆盖生效，难维护 | P0 |

已确认不需要推翻的部分：

- 原先异常巨大的紫色操作块已消失。
- 320px、390px 和横屏未观察到页面级横向溢出。
- 手机顶栏、阶段栏和“更多”抽屉基本可用。
- 默认患者入口不显示 Dev Tools，只有 `?devtools=1` 显示。

## 5. 移动端设计令牌

### 5.1 色彩令牌

保留并统一使用现有语义：

| 语义 | 变量 | 建议值 | 用途 |
|---|---|---:|---|
| 页面背景 | `--rm-mobile-bg` | `#f5f7fa` | 页面底色 |
| 任务表面 | `--rm-mobile-surface` | `#ffffff` | 卡片、输入、底栏 |
| 主文字 | `--rm-mobile-text` | `#202838` | 标题、正文 |
| 次文字 | `--rm-mobile-muted` | `#596579` | 辅助说明 |
| 主操作 | `--rm-mobile-primary` | `#5659c9` | 唯一主按钮、进度 |
| 主操作深色 | `--rm-mobile-primary-deep` | `#42469f` | 选中态文字、小标题 |
| 选中浅底 | `--rm-mobile-selected` | `#eceefa` | 选择态、轻提示 |
| 改善 | `--rm-mobile-success` | `#237a68` | 改善文字/边框 |
| 改善浅底 | `--rm-mobile-success-soft` | `#e8f5f1` | 改善卡 |
| 谨慎 | `--rm-mobile-warning` | `#8a5a16` | 等待、无明显变化 |
| 谨慎浅底 | `--rm-mobile-warning-soft` | `#fff7e6` | 谨慎卡 |
| 危险 | `--rm-mobile-danger` | `#b54747` | 停止、加重、转介 |
| 分隔线 | `--rm-mobile-line` | `#dce2ea` | 普通边框 |
| 控件边框 | `--rm-mobile-control-line` | `#7c8799` | 次按钮边框 |

禁止事项：

- 不新增与上述语义重复的蓝、紫、绿。
- 不用红色标记普通“保存”或“返回”。
- 不用渐变制造普通卡片层级。
- 不把所有卡都染成浅紫；浅紫只用于选中和当前任务。

### 5.2 空间、尺寸和排版令牌

在 `:root` 或 v2 作用域一次性定义，之后使用变量：

```css
--rm-mobile-page-gutter: 16px;
--rm-mobile-section-gap: 16px;
--rm-mobile-card-radius: 14px;
--rm-mobile-control-radius: 11px;
--rm-mobile-touch-min: 44px;
--rm-mobile-action-min: 52px;
--rm-mobile-action-gap: 8px;
--rm-mobile-action-height: 84px; /* 仅是正文留白的首屏回退值 */
```

排版硬规则：

- 页面主标题：24–29px，行高 1.35–1.4，最多让自然换行决定高度，不截断。
- 卡片标题：17–21px，行高不低于 1.35。
- 正文：15–16px，行高 1.55–1.7。
- 控件文字：默认 15–16px；不得低于 14px。
- 辅助文字：12–14px；关键信息不得放进 11px。
- 表单控件至少 16px，避免 iOS 聚焦放大。
- 所有可点击控件触摸目标至少 44×44px。

## 6. 统一动作合同

这是本方案最重要的部分。必须先完成动作合同，再做逐页美化。

### 6.1 动作角色

每个固定底栏按钮都必须显式声明角色：

```tsx
data-action-role="primary"
data-action-role="secondary"
data-action-role="tertiary"
```

角色定义：

- `primary`：用户完成当前任务后最可能执行的下一步；一个底栏只能有一个。
- `secondary`：回到上一步、查看记录、补充信息等保留路径。
- `tertiary`：保存后退出、暂不训练、稍后继续等替代路径。

主按钮仍保留 `.rm-primary`，用于颜色语义；`data-action-role` 用于布局语义。两者不得互相替代。

### 6.2 容器合同

保留现有类名以减少业务风险，但增加明确布局属性：

```tsx
<div
  className="rm-page-actions three"
  data-action-layout="three"
  aria-label="当前步骤操作"
>
  ...
</div>
```

允许布局：

- `single`：一个按钮。
- `split`：一个次操作 + 一个主操作。
- `three`：两个次操作 + 一个主操作。

固定底栏禁止出现四个及以上按钮。若业务分支产生四个动作，将最低优先级动作移入正文中的详情区或“更多选择”，不能继续压缩按钮。

### 6.3 DOM 与视觉顺序

推荐 DOM 顺序就是阅读顺序：`secondary → tertiary → primary`。但 CSS 仍必须根据 `data-action-role` 布局，防止条件分支变更后错位。

禁止使用：

```css
button:first-child { order: 3; }
button:last-child { ...主按钮规则... }
```

### 6.4 按钮文字规则

- 按钮使用“动作 + 结果”，例如“返回训练”“保存并结束”“进入关键确认”。
- 同一动作在不同页面使用同一个名称。
- 不用“提交”“确定”这类结果不明确的词。
- 不把状态说明拼进按钮，例如禁止“上一步 · 还需补充”。
- 默认字号下按钮允许两行，但不允许省略号截断。
- 能在不改变含义时，优先控制在 4–8 个汉字；不得为了单行而损失临床含义。

### 6.5 禁用规则

删除以下两类通用伪元素：

```css
button:disabled::after { content: " · 还需补充"; }
```

正确做法：

1. 按钮文字只描述动作。
2. 页面当前问题区域显示缺失内容。
3. 禁用按钮用 `aria-describedby` 指向已有说明。
4. 只有必须在底栏内解释时，组件显式渲染 `.rm-action-note`，不能由 CSS 猜测原因。

示例：

```tsx
<p id="training-action-note" className="rm-action-note" role="status">
  还需记录 2 个动作的第一组反馈
</p>
<button
  type="button"
  className="rm-primary"
  data-action-role="primary"
  aria-describedby="training-action-note"
  disabled={!hasCompleteTrainingFeedback}
>
  训练完成，整体复测
</button>
```

如果正文已经有同样的可见说明，不要再在底栏重复渲染 `.rm-action-note`。

## 7. 目标线框图和精确布局

图中从上到下即视觉阅读顺序。`P` 是主操作，`S` 是次操作，`T` 是第三操作。

### 7.1 单按钮

320px 与 390px 相同：

```text
┌──────────────────────────────┐
│            正文               │
│                               │
├──────────────────────────────┤
│ [ P：继续 / 保存当前记录 ]     │  52px 按钮
└──────────────────────────────┘
```

### 7.2 双按钮，360px 及以上

```text
┌────────────────────────────────────┐
│                正文                 │
├────────────────────────────────────┤
│ [ S：返回 ] [ P：进入下一步       ] │
│     0.8fr            1.2fr          │
└────────────────────────────────────┘
```

要求：次操作在左，主操作在右；底栏默认内容高度约 72px，加设备安全区。

### 7.3 双按钮，359px 及以下

```text
┌──────────────────────────────┐
│            正文               │
├──────────────────────────────┤
│ [ S：返回                   ] │
│ [ P：进入下一步             ] │
└──────────────────────────────┘
```

要求：次操作在上，主操作在最底部；默认内容高度目标不超过 118px，加设备安全区。

### 7.4 三按钮，所有手机宽度

```text
┌────────────────────────────────────┐
│                正文                 │
├────────────────────────────────────┤
│ [ S：查看记录 ] [ T：保存并结束 ]   │
│ [ P：继续当前康复流程             ] │
└────────────────────────────────────┘
```

要求：

- 永远是两行，不允许 320px 下变成三行。
- 两个次操作在第一行等宽。
- 主操作独占第二行，并位于底栏最底部。
- 默认字号、无安全区时，底栏内容总高度目标不超过 120px。
- 开启系统大字号时允许自然增高，不能截字或覆盖正文。

### 7.5 横屏 844×390

```text
┌──── 顶栏/阶段栏 ──────────────────────────────┐
│ 正文使用较紧的垂直间距；弹层高度受 100dvh 限制 │
├───────────────────────────────────────────────┤
│ [ S ] [ T ] [              P              ]   │
└───────────────────────────────────────────────┘
```

横屏允许三按钮同一行，但仅在以下条件同时满足时使用：

- `orientation: landscape`
- `max-height: 600px`
- 三个按钮文字在 14px 下均不超过两行
- 底栏不遮挡当前输入或弹窗

若不能保证，仍使用“两次操作 + 一行主操作”的两行结构。不要为了节省高度让按钮宽度窄到逐字换行。

## 8. CSS 权威结构与特异性策略

### 8.1 先清理，再编写

`mobile-patient.css` 当前在约 164、418、997、1031 行附近重复定义固定底栏。执行时：

1. 搜索 `.rm-page-actions`、`.rm-guided-nav`、`.rm-one-action`、`--rm-mobile-action-height`。
2. 标记每个声明属于基础、窄屏、横屏还是最终覆盖。
3. 删除重复的基础声明。
4. 保留一个“Mobile action rail”权威区块。
5. 窄屏与横屏媒体查询只写差异属性，不复制整套固定定位、背景和阴影。
6. 删除文件末尾“Final mobile polish”式补丁区；把有效规则合并回权威区块。

完成后，同一个属性不应在相同媒体条件下由三处以上规则竞争。

### 8.2 推荐 CSS 骨架

下面是结构示意，执行者应按现有命名接入，不要机械覆盖与业务无关的规则：

```css
@media (max-width: 720px),
  (orientation: landscape) and (max-width: 1024px) and (max-height: 600px) {
  .rm-app[data-mobile-ui="v2"] .rm-workspace {
    padding-bottom: calc(var(--rm-mobile-action-height, 84px) + 20px);
  }

  .rm-app[data-mobile-ui="v2"] :is(
    .rm-page-actions:not(.rm-intake-actions),
    .rm-guided-nav,
    .rm-one-action
  ) {
    position: fixed;
    inset: auto 0 0;
    z-index: 120;
    width: min(100%, 720px);
    min-height: 0;
    margin-inline: auto;
    padding: 8px 16px calc(8px + env(safe-area-inset-bottom));
    border-top: 1px solid var(--rm-mobile-line);
    background: rgba(255, 255, 255, .97);
    box-shadow: 0 -8px 24px rgba(32, 40, 56, .08);
    backdrop-filter: blur(14px);
  }

  .rm-app[data-mobile-ui="v2"] [data-action-layout="split"] {
    display: grid;
    grid-template-columns: minmax(0, .8fr) minmax(0, 1.2fr);
    gap: 8px;
  }

  .rm-app[data-mobile-ui="v2"] [data-action-layout="split"]
    > [data-action-role="secondary"] { grid-column: 1; }

  .rm-app[data-mobile-ui="v2"] [data-action-layout="split"]
    > [data-action-role="primary"] { grid-column: 2; }

  .rm-app[data-mobile-ui="v2"] [data-action-layout="three"] {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 7px;
  }

  .rm-app[data-mobile-ui="v2"] [data-action-layout="three"]
    > [data-action-role="secondary"] { grid-area: 1 / 1; }

  .rm-app[data-mobile-ui="v2"] [data-action-layout="three"]
    > [data-action-role="tertiary"] { grid-area: 1 / 2; }

  .rm-app[data-mobile-ui="v2"] [data-action-layout="three"]
    > [data-action-role="primary"] { grid-area: 2 / 1 / 3 / -1; }
}

@media (max-width: 359px) {
  .rm-app[data-mobile-ui="v2"] [data-action-layout="split"] {
    grid-template-columns: 1fr;
  }

  .rm-app[data-mobile-ui="v2"] [data-action-layout="split"]
    > [data-action-role="secondary"] { grid-area: 1 / 1; }

  .rm-app[data-mobile-ui="v2"] [data-action-layout="split"]
    > [data-action-role="primary"] { grid-area: 2 / 1; }
}
```

注意：如果底栏含 `.rm-action-note`，需要给它 `grid-column: 1 / -1`；不要让它占用按钮角色槽位。

### 8.3 特异性纪律

- 患者端覆盖统一以 `.rm-app[data-mobile-ui="v2"]` 开头。
- 使用类和 `data-*` 语义属性，不根据子元素序号判断角色。
- 不使用 `!important` 修复底栏；现有其他区域的 `!important` 不在本轮顺手清理。
- 不用内联 style 决定响应式排列。
- 每个媒体查询只覆盖必要差异。
- 修改完成后运行 `rg -n "first-child.*order|disabled::after|rm-mobile-action-height"` 人工检查。

### 8.4 旧规则处理

处理 `complete-demo.css:1398–1399`：

- 删除或收窄 `.rm-page-actions... > button:first-child { order: 3; }`。
- 患者 v2 不得再命中这条规则。
- 如果必须保留旧页面兼容，只能明确限定到非 v2 容器，且在代码注释中说明原因。
- 不要只在 `mobile-patient.css` 再加一个更高特异性 `order` 去压住它。

## 9. 固定底栏测量的施工步骤

当前 `rehabmind-workbench.tsx:6793–6819` 使用 `ResizeObserver` 写入 `--rm-mobile-action-height`。保留这个能力，但修正职责：变量只描述实测高度，供正文留白使用，不能决定底栏自身高度。

### 9.1 CSS 修改

1. 从底栏容器删除所有 `min-height: var(--rm-mobile-action-height)`。
2. 底栏本身使用内容高度与固定 padding。
3. `.rm-workspace` 使用 `padding-bottom: calc(var(--rm-mobile-action-height) + 20px)`。
4. 不要再次叠加 `env(safe-area-inset-bottom)`，因为实测底栏高度已经包含底栏安全区 padding。
5. 初始令牌保留 84px 回退，避免 JS 首次测量前正文贴底。

### 9.2 JavaScript 修改

测量逻辑必须：

1. 只选择当前可见且实际固定定位的操作区。
2. 排除 `display:none`、高度为 0 和不在当前页面的节点。
3. 操作区切换时停止观察旧节点并观察新节点。
4. 页面没有固定操作区时写入 `0px`。
5. 高度写入取整，但避免相同值重复写 style。

建议结构：

```tsx
const actionCandidates = workspace.querySelectorAll<HTMLElement>(
  '.rm-page-actions:not(.rm-intake-actions), .rm-guided-nav, .rm-one-action'
);
const action = Array.from(actionCandidates).find((element) => {
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return style.display !== 'none' && style.position === 'fixed' && rect.height > 0;
});

const nextHeight = action ? `${Math.ceil(action.getBoundingClientRect().height)}px` : '0px';
if (app.style.getPropertyValue('--rm-mobile-action-height') !== nextHeight) {
  app.style.setProperty('--rm-mobile-action-height', nextHeight);
}
```

不要把业务状态加入这个 effect；现有依赖只用于在页面分支切换后重新寻找操作区。

### 9.3 测量验收

- 单按钮栏连续观察 5 秒，高度不持续增长。
- 从双按钮页面进入三按钮页面，正文底部留白同步更新。
- 从三按钮返回双按钮，高度能缩小。
- 打开抽屉后底栏不浮在抽屉上方；抽屉 z-index 高于底栏。
- 关闭抽屉后底栏恢复，不需要刷新。

## 10. 第 1–6 步逐页整改清单

### 10.1 第 1 步：症状信息

文件：`src/features/rehabmind/components/stages/symptom-stage.tsx`

当前问题：

- `.rm-guided-nav` 固定在底部，负责“上一步/下一步”。
- `.rm-intake-actions` 留在正文，负责“进入关键确认”。
- 当所有引导问题完成时，底部只剩禁用“上一步”，正文另有主按钮。

执行步骤：

1. 把引导流程的最终主操作放进 `.rm-guided-nav`。
2. 当 `nextMissingField` 存在时，主按钮仍是“下一步”。
3. 当 `nextMissingField` 不存在且 `keyConfirmationReady` 为真时，主按钮改为“进入关键确认”，调用原 `enterKeyConfirmation`。
4. “上一步”声明 `data-action-role="secondary"`。
5. “下一步/进入关键确认”声明 `data-action-role="primary"`。
6. `.rm-guided-nav` 声明 `data-action-layout="split"`。
7. 删除引导模式正文末尾重复的 `.rm-intake-actions` 主按钮。
8. 全部信息模式如仍需操作，渲染同一套固定底栏；不要恢复正文动作区。
9. 缺失字段列表继续在正文 `.rm-guided-status` 或专门状态区显示，不拼进禁用按钮。
10. 自助转介、刺痛、循环信号等早退分支保留原安全语义和调用，不改成普通继续按钮。

建议条件结构：

```tsx
const guidedPrimaryAction = nextMissingField
  ? { label: '下一步', disabled: !guidedQuestionReady, onClick: () => advanceGuidedQuestion(nextMissingField) }
  : { label: '进入关键确认', disabled: !keyConfirmationReady, onClick: enterKeyConfirmation };
```

不要为这段表现逻辑新增持久化状态。

验收：

- 第一个问题：底部有返回和下一步；禁用下一步不追加错误文案。
- 中间问题：选中答案后主按钮启用。
- 最后问题：底部主按钮原位变为“进入关键确认”。
- 页面正文不再出现第二个同名主按钮。
- 点击逻辑和原业务路径一致。

回归风险：条件分支可能同时渲染 `.rm-guided-nav` 和转介动作。用 DOM 检查保证可见固定动作区最多一个。

### 10.2 第 2 步：关键确认

文件：`src/features/rehabmind/components/stages/confirmation-stage.tsx`

执行步骤：

1. 普通底栏维持“返回 + 继续”，补齐动作角色和布局属性。
2. 术后专项指导分支当前 DOM 为“主按钮 + 保存”；改为 DOM 阅读顺序“保存本次信息 + 去术后指导站查看”。
3. “去术后指导站查看”是该分支主操作；“保存本次信息”是次操作。
4. 不能改变 `window.open` 的 URL、`noopener` 或保存回调。
5. 安全转介单按钮保持原业务出口；如果纳入固定栏，声明 `single`，不要额外制造返回入口。
6. 确认三段安全进度在 320px 下仍保持可读，文字不得小于 12px。

验收：

- 普通流程主按钮始终右侧/底部。
- 术后分支保存位于左侧，外部指导主操作位于右侧。
- 未完成问题时，页面可见区域明确告诉用户缺哪项。
- 安全信号分支没有被样式调整绕过。

回归风险：调整 DOM 顺序可能影响源码字符串测试。不要改 B 类测试，交付时登记。

### 10.3 第 3 步：评估检查

文件：`src/features/rehabmind/components/stages/assessment-stage.tsx`、`mobile-patient.css`

按钮整改：

1. 给所有 `.rm-page-actions split` 的返回按钮加 `secondary`。
2. 给“下一项/确认/查看结果/进入处理”加 `primary`。
3. 所有分支保持一个主操作。
4. 禁用原因由当前检查卡内的缺失问题提示承载。

长标题整改：

1. `.rm-check-card > header > div` 必须 `min-width: 0; flex: 1`。
2. 标题 `strong` 使用 `overflow-wrap: anywhere` 作为最后保护，但优先自然中文换行。
3. 320px 下把头部图标从 38px 收到 34px，gap 由 13px 收到 10px。
4. 若头部还有右侧状态徽标，允许徽标换到第二行，不和标题争一列。
5. 不用 `white-space: nowrap`，不用省略号隐藏检查名称。
6. 用实际标题“双腿闭链下蹲功能检查”验证，不允许最后一个字单独成行；如果仍孤行，先释放标题宽度，再考虑微调字号到 16px，不能降到 14px。

验收：

- 320px 下完整显示检查名。
- 当前/总数、图标和标题层级清楚。
- 所有结果选项至少 44px 高。
- 双侧三选项在 320px 下若文本拥挤，改为单列或 `2+1`，不能缩成小字。

回归风险：评估页面分支很多。只加属性和改表现，不修改 `itemComplete`、`assessmentReadyForTreatment` 等条件。

### 10.4 第 4 步：处理与复测

文件：`src/features/rehabmind/components/stages/treatment-retest-stage.tsx`、`mobile-patient.css`

这是按钮整改量最大的页面。至少逐一检查当前约 652、669、734、751、809–816、955 行附近的 `.three` 分支。

执行步骤：

1. 为每个三按钮分支建立动作语义表，再写属性。
2. 继续当前康复路径的按钮通常是 `primary`。
3. “查看评估记录”“补充症状信息”“修改评估答案”通常是 `secondary`。
4. “保存并结束”“保存，之后继续”通常是 `tertiary`。
5. 如果某个风险分支的最安全建议是“重新评估”，它应是 `primary`，即使“保存并结束”在业务上也可执行。
6. 不要仅根据按钮是否有 `.rm-primary` 猜角色；人工阅读分支语义。
7. 把 DOM 调整为 `secondary → tertiary → primary`；回调、参数、状态文字完全保留。
8. 三按钮统一两行结构，主按钮整行置底。
9. `.rm-treatment-card` 维持浅色“部位 → 做法”上下结构，不恢复高饱和紫色大块。
10. 复测选项应靠近当前复测问题，不能被固定底栏遮挡。

建议先做一张分支核对表：

| 场景 | Secondary | Tertiary | Primary |
|---|---|---|---|
| 处理后加重 | 补充症状信息 | 保存并结束 | 确认加重后的变化/重新评估 |
| 评估未完成 | 补充症状信息或查看记录 | 保存，之后继续 | 完成缺失检查 |
| 处理完成 | 查看评估记录 | 保存并结束 | 查看训练与居家方案 |
| 无明确处理方向 | 查看评估记录 | 保存并结束 | 补充症状信息或进入安全的下一路径 |
| 可继续训练 | 查看/修改评估 | 视分支决定 | 查看训练与居家方案 |

若代码实际语义与表中示意不同，以现行决策规则为准，但仍必须只指定一个主操作。

验收：

- 遍历每个三按钮分支，按钮顺序相同。
- 320×568 默认字号下底栏主体高度不超过 120px。
- 固定栏不遮住复测结果和最后一个可选项。
- 加重/转介分支仍显示红色语义提示，但普通主按钮仍使用靛紫，不用红色冒充主次层级。
- 处理卡不再出现整屏紫色高度反馈。

回归风险：该页条件嵌套很深。每次只改 JSX 标签顺序和表现属性；不要改三元条件、回调体或保存状态字符串。

### 10.5 第 5 步：训练与居家

文件：`src/features/rehabmind/components/stages/training-stage.tsx`、`mobile-patient.css`

内容布局：

1. 手机端将 `.rm-exercise-detail dl > div` 从桌面 `88px 1fr` 改为单列。
2. `dt` 作为小标题放在 `dd` 上方，间距 4–6px。
3. “为什么练这个”“怎么做”完整显示，不逐字换行。
4. 进阶/退阶详情的 summary 触摸高度至少 44px。
5. 第一组反馈按钮在 390px 可两列，在 320px 根据实际文字改为单列或 2+2；不得通过 12px 字号硬塞。

操作区：

1. 当前底栏有三个按钮：返回处理记录、训练完成、暂不训练保存方案。
2. 角色固定为：`secondary=返回处理记录`、`tertiary=暂不训练，保存方案`、`primary=训练完成...`。
3. DOM 和视觉使用统一三按钮合同。
4. 加重分支的主操作是“处理这次加重”，保存退出为次/第三操作；顺序按合同排列。
5. “还需记录哪些动作反馈”保留在正文 `.rm-training-feedback-gate`，主按钮用 `aria-describedby` 关联；不要把原因追加到按钮里。

验收：

- “为什么练这个”不再形成 88px 窄列。
- 第一组反馈的四个选项都能清楚点击。
- 三按钮栏两行完成，训练主操作在最底部整行。
- 禁用主按钮文字不变，正文明确列出未反馈动作。
- 加重路径仍优先停止并处理异常反应。

回归风险：不能改变 `recordQuickFeedback`、`hasCompleteTrainingFeedback`、`trainingHasWorsened` 或进退阶条件。

### 10.6 第 6 步：康复总结

文件：`src/features/rehabmind/components/stages/summary-stage.tsx`、`mobile-patient.css`

总结头卡：

1. 将 `.rm-session-hero` 从深蓝大渐变改为浅色结果卡。
2. 推荐表面：白色或极浅靛紫；左侧/顶部用 4px 语义色条表达结果。
3. 主要结果数字或结论用主文字色；改善信息用薄荷色强调。
4. 不改变总结字段、数值、前后分数和推荐文字。
5. 多动作场景继续显示全部必要信息，但采用纵向信息组，不做拥挤双列。
6. 结果状态颜色按业务：改善=薄荷，谨慎/不明显=琥珀，加重/停止=红。

总结内容：

1. 手机上所有 dashboard、summary grid 使用单列。
2. 卡片内标签列不得固定过窄；允许标签在上、内容在下。
3. 次要详情可折叠，但不能默认隐藏停止、转介和下次安排。

操作区：

1. 首次总结普通出口：`secondary=返回训练`，`primary=保存本次记录`。
2. 其他复诊/随访分支逐一加角色属性。
3. 如果 JSX 当前为“主按钮在前、保存随后”，按阅读顺序重排。
4. 所有“保存第 N 次康复”属于主操作，保持右侧/底部。

验收：

- 首屏视觉焦点是“本次结果”，不是一大块装饰性深蓝背景。
- 前后分数、主要改善、仍需关注和下一步都能在 320px 阅读。
- 保存按钮位置与前五步主按钮规则一致。
- 总结页到底后最后一张卡不被底栏遮挡。

回归风险：总结页面包含首次与后续康复多分支，不能只测首次流程。

## 11. 抽屉、弹窗、键盘、安全区与横屏

### 11.1 抽屉

适用：阶段抽屉、更多抽屉、案例侧栏。

- 抽屉 `z-index` 必须高于固定底栏。
- 打开抽屉时，背景不可继续滚动。
- 抽屉最大高度使用 `82dvh` 左右，并包含底部安全区。
- 内容超出时抽屉内部滚动，关闭按钮始终可见。
- 点击遮罩关闭；按 Escape 关闭；关闭后焦点回到触发按钮。
- 不允许固定底栏透过抽屉继续响应点击。

### 11.2 弹窗

- 320×568 下弹窗四周至少保留 12px。
- 最大高度用 `calc(100dvh - 24px)`，正文内部滚动。
- 操作按钮不应被键盘或安全区遮挡。
- 必须有 `role="dialog"`、标题关联和焦点管理。
- 关闭按钮触摸目标至少 44px。

### 11.3 软键盘

至少检查症状描述 textarea：

- 输入框聚焦后不应被固定底栏覆盖。
- 必要时在 `visualViewport` 变化或浏览器自然滚动后，确保输入框和当前提示都可见。
- 不要简单在键盘出现时永久隐藏所有操作；如果隐藏，键盘关闭后必须恢复。
- iOS 输入字号保持 16px 及以上。

### 11.4 安全区

- 固定底栏的 `padding-bottom` 加 `env(safe-area-inset-bottom)`。
- 底栏的实测高度已经包含安全区；正文留白不要重复再加一次。
- 抽屉和全屏记录页也要各自处理安全区。

### 11.5 大字号

人工将浏览器字号或页面缩放提高到 125%/200% 检查：

- 按钮可以增高，不截断、不重叠。
- 底栏高度测量能随内容变化。
- 页面最后一个字段仍可滚动到底栏上方。
- 不使用固定 `height` 锁死中文按钮。
- WCAG reflow 检查下不出现二维滚动。

### 11.6 横屏

- 844×390 时保持患者端壳，不切成桌面侧栏。
- 顶栏和阶段栏合计高度尽量不超过 100px。
- 固定底栏优先单行；文字拥挤时回退两行，不缩小到不可读。
- 弹窗/欢迎页使用 `100dvh`，不得上下裁切。
- 正文可滚动区域至少保留约 190px 可视高度。

## 12. 分阶段施工顺序

### 阶段 A：基线冻结

修改文件：无。

步骤：

1. `git status --short`，记录现有改动。
2. 运行 `git diff --check`。
3. 启动现有开发服务器或确认端口 3000 的服务器属于当前仓库。
4. 截取 320×568、390×844、844×390 的当前第 1–6 步与三按钮页。
5. 用浏览器实测 `.rm-page-actions` 的 `getBoundingClientRect().height`。

验收：有可对比的前态截图和高度数据。

风险：不要为了跑浏览器测试结束用户正在使用的服务器；先确认进程归属。

### 阶段 B：建立动作标记合同

修改文件：六个 stage 组件。

步骤：

1. 搜索全部 `rm-page-actions`、`rm-guided-nav`、`rm-one-action`。
2. 为每个底栏写明 `data-action-layout`。
3. 为每个按钮写明 `data-action-role`。
4. 每个容器检查主操作数量必须等于 1；纯返回页例外可为 0。
5. 不改 disabled 条件和事件回调。

验收：源码搜索可明确得到所有动作角色，不再依赖元素位置推断。

风险：条件 JSX 中可能同一视觉容器分支渲染不同数量按钮，属性应落在实际分支容器上。

### 阶段 C：清理 CSS 并实现统一布局

修改文件：`mobile-patient.css`、必要时 `complete-demo.css`。

步骤：按第 8 节执行；先删除重复，再加入权威区块。

验收：

- 相同媒体条件下只有一套固定底栏基础规则。
- 无通用 `disabled::after`。
- v2 不命中 `first-child order`。
- 320px 三按钮是两行。

风险：CSS 顺序变化可能暴露之前被覆盖的问题。每删一组重复规则就用浏览器复核。

### 阶段 D：修正底栏测量

修改文件：`rehabmind-workbench.tsx`、`mobile-patient.css`。

步骤：按第 9 节执行。

验收：底栏高度稳定、正文留白匹配、无反馈增长。

风险：MutationObserver 可能频繁触发；只有高度变化时才写变量。

### 阶段 E：逐页视觉整改

执行顺序：第 1 步 → 第 4 步 → 第 5 步 → 第 2 步 → 第 3 步 → 第 6 步。

原因：先处理操作系统的最明显断裂和三按钮高风险页，再完成内容排版和总结视觉。

每页循环：

1. 改一个页面。
2. typecheck。
3. 320px 浏览器检查。
4. 390px 浏览器检查。
5. 横屏快速检查。
6. 再进入下一页。

### 阶段 F：弹层和无障碍收口

修改文件：`mobile-app-navigation.tsx`、`ui-primitives.tsx`、样式文件，仅在实测发现问题时。

验收：焦点、Escape、遮罩、滚动锁、安全区和 44px 目标全部满足。

风险：不要借机更改导航权限或记录页业务。

### 阶段 G：全量验证和交接

步骤见第 13–15 节。

## 13. 自动化验证命令

在仓库根目录执行。

### 13.1 每个小阶段都运行

```powershell
npm run typecheck
git diff --check
```

### 13.2 动作合同检查

```powershell
rg -n 'rm-page-actions|rm-guided-nav|rm-one-action' src/features/rehabmind/components
rg -n 'first-child.*order|disabled::after|min-height:\s*var\(--rm-mobile-action-height\)' src/features/rehabmind/styles
node --test tests/component/mobile-app-shell-contract.test.mjs
```

注意：`tests/**` 只读。执行测试不等于允许修改测试。

### 13.3 浏览器预览

```powershell
npm run test:browser:mobile-preview
```

若命令因 3000 端口已有 vinext 服务而拒绝启动：

1. 先确认已有服务是否为当前仓库。
2. 不要直接杀掉未知进程。
3. 使用现有服务做人工浏览器检查，或在确认安全后停止当前仓库自己的服务再重跑。
4. 报告必须写清“基础设施启动冲突”，不能写成“页面测试失败”，也不能写成“测试通过”。

### 13.4 建议的最终门禁

```powershell
npm run check:boundaries
npm run typecheck
npm run build
node --test tests/component/mobile-app-shell-contract.test.mjs
npm run test:browser:mobile-preview
git diff --check
```

如果现行工程规则指出 dev 树测试副本有预存失败，使用“改动前失败集合与改动后失败集合的差集”判断，不要把预存红当成本轮回归，也不要忽略新增失败。

## 14. 人工验收矩阵

### 14.1 视口

必须覆盖：

| 视口 | 用途 |
|---|---|
| 320×568 | 最窄支持宽度和短屏高压场景 |
| 360×800 | 双按钮横向切换边界 |
| 390×844 | 主流 iPhone 逻辑视口 |
| 412×915 | 常见 Android |
| 430×932 | 当前支持上限 |
| 844×390 | 手机横屏 |

### 14.2 每个视口都检查

- [ ] 无 `document.documentElement.scrollWidth > clientWidth`。
- [ ] 顶栏品牌、当前记录、更多按钮不重叠。
- [ ] 阶段栏可读，进度与当前步一致。
- [ ] 主标题不被截断。
- [ ] 所有点击目标至少 44px。
- [ ] 选中态与未选态可区分，不只依赖颜色。
- [ ] 底栏只出现一次。
- [ ] 主操作位置符合合同。
- [ ] 页面最后一项可滚动到底栏上方。
- [ ] 抽屉/弹窗打开时底栏不可点击。
- [ ] 禁用按钮没有自动追加错误文案。
- [ ] 焦点轮廓可见。

### 14.3 六步场景

第 1 步：

- [ ] 初始描述输入。
- [ ] 引导问题未回答。
- [ ] 引导问题已回答。
- [ ] 最后问题完成，主按钮变为进入关键确认。
- [ ] 查看全部信息。
- [ ] 早期转介分支。

第 2 步：

- [ ] 三个安全阶段。
- [ ] 普通继续。
- [ ] 安全信号保存出口。
- [ ] 术后指导出口。

第 3 步：

- [ ] 长标题检查卡。
- [ ] 功能、活动度、力量和特殊检查。
- [ ] 双侧比较。
- [ ] 未完成禁用主按钮。
- [ ] 评估总结弹层/页面。

第 4 步：

- [ ] 单按钮、双按钮、三按钮各一例。
- [ ] 处理前、处理中、复测后。
- [ ] 改善、不明显、部分改善、加重。
- [ ] 缺失评估。
- [ ] 保存并结束。

第 5 步：

- [ ] 多个训练动作切换。
- [ ] 为什么练、怎么做、进退阶。
- [ ] 四种第一组反馈。
- [ ] 未完成反馈门禁。
- [ ] 加重出口。
- [ ] 三按钮底栏。

第 6 步：

- [ ] 首次康复总结。
- [ ] 改善、未明显改善、加重/转介视觉。
- [ ] 保存本次记录。
- [ ] 后续康复/第 N 次保存。
- [ ] 长列表滚动到底。

### 14.4 状态组合

至少覆盖：

- 默认字号、125% 与 200% 缩放。
- 无安全区模拟与有底部安全区设备模拟。
- 键盘关闭和 textarea 聚焦键盘打开。
- 抽屉关闭和打开。
- `?devtools=1` 与默认入口；默认入口不得出现 Dev Tools。
- 触摸操作和键盘 Tab 操作。

## 15. 截图与像素验收方法

实现者不能只说“我打开看过”。必须提交可复核证据。

每张截图命名建议：

```text
mobile-ui-phase2-step-01-320x568.png
mobile-ui-phase2-step-04-three-actions-320x568.png
mobile-ui-phase2-step-05-training-390x844.png
mobile-ui-phase2-step-06-summary-390x844.png
mobile-ui-phase2-landscape-844x390.png
```

浏览器控制台记录：

```js
const rail = document.querySelector(
  '.rm-page-actions:not(.rm-intake-actions), .rm-guided-nav, .rm-one-action'
);
({
  viewport: [window.innerWidth, window.innerHeight],
  railHeight: rail?.getBoundingClientRect().height,
  scrollWidth: document.documentElement.scrollWidth,
  clientWidth: document.documentElement.clientWidth,
  actionVar: getComputedStyle(document.querySelector('.rm-app'))
    .getPropertyValue('--rm-mobile-action-height'),
});
```

硬判定：

- 320px 三按钮默认字号：两行；无安全区主体高度 ≤120px。
- 390px 双按钮默认字号：一行。
- 320px 双按钮默认字号：两行，主按钮在下。
- 横向溢出差值必须为 0。
- `actionVar` 与实测 railHeight 取整后一致。
- 页面最后一个内容元素底部可滚动到 rail 顶部以上至少 16px。

## 16. 回归风险清单

| 风险 | 触发方式 | 防护 |
|---|---|---|
| 业务按钮回调被改错 | 重排 JSX 时复制/粘贴 | 只移动完整 button 节点，不改回调体 |
| 主操作数量超过一个 | 条件按钮都标 primary | 逐分支检查渲染结果 |
| 底栏高度反馈增长 | 测量变量继续用于自身 min-height | CSS 搜索必须为 0 处命中 |
| 正文底部留白双算安全区 | rail 测量含 safe area，workspace 又加 env | workspace 只加实测高度 + 固定 runway |
| 第 1 步两套底栏同时出现 | guided 与 intake action 条件重叠 | 可见 action rail 数量断言为 1 |
| 桌面端受影响 | 全局改 `.rm-page-actions` | 所有新规则限制在 v2 手机媒体查询 |
| 条件分支遗漏 | 只走 happy path | 按第 14.3 节逐场景检查 |
| 长文案被截断 | 用固定 height/ellipsis | 使用 min-height，允许自然增高 |
| 测试字符串失败 | DOM 顺序/属性改变 | 不改 B 类测试，记录解钉需求 |
| 抽屉后仍能点底栏 | z-index/指针事件错误 | 抽屉实测并检查焦点 |

## 17. 禁止的实现方式

执行者不得：

1. 在 CSS 文件末尾不断追加更高特异性规则来覆盖旧规则。
2. 使用 `first-child`、`last-child` 推断主次动作。
3. 通过缩小到 12px 或逐字换行把三个按钮塞进一行。
4. 把三按钮在 320px 直接改成三行。
5. 使用固定高度截断按钮或标题。
6. 给所有 disabled 按钮自动加同一句原因。
7. 为了截图好看隐藏真实业务按钮或真实警告。
8. 修改 disabled 条件让按钮提前启用。
9. 修改临床文案含义来换取更短按钮。
10. 修改测试文件让断言通过。
11. 只检查首页，不走第 4–6 步复杂状态。
12. 把“自动化通过”当成视觉验收通过。

## 18. 完成定义（Definition of Done）

以下全部满足才算完成：

- [ ] 第 1–6 步所有固定动作区都标注显式布局和角色。
- [ ] 每个可见动作区最多一个 primary。
- [ ] 不存在通用 `button:disabled::after` 追加原因。
- [ ] 患者 v2 不再依赖 `first-child order`。
- [ ] 固定底栏只有一套权威基础 CSS。
- [ ] `--rm-mobile-action-height` 只用于正文留白，不用于底栏自身 min-height。
- [ ] 第 1 步只有一套统一操作区。
- [ ] 第 4、5 步三按钮在 320px 为两行，主操作独占最后一行。
- [ ] 第 3 步长检查名无孤字异常。
- [ ] 第 5 步训练说明不使用 88px 窄标签列。
- [ ] 第 6 步总结头卡回归浅色任务主题。
- [ ] 320、360、390、412、430px 均无横向溢出。
- [ ] 844×390 横屏可完成操作。
- [ ] 抽屉、弹窗、键盘和安全区检查通过。
- [ ] 125%/200% 大字号不截字、不覆盖。
- [ ] `npm run typecheck` 通过。
- [ ] `git diff --check` 通过。
- [ ] 移动壳组件合同测试无新增失败。
- [ ] 浏览器移动预览通过，或对基础设施阻塞给出准确说明。
- [ ] 已提交前后截图和底栏高度数据。
- [ ] 未修改任何 B 类文件和业务决策规则。

## 19. 最终交接模板

实现者完成后按下列格式汇报：

```markdown
### 已完成
- 动作合同：共处理 X 个底栏、X 个按钮；所有底栏最多一个主操作。
- CSS：删除 X 处重复规则，保留 1 个权威底栏区块。
- 页面：第 1–6 步整改完成。

### 关键实测
| 场景 | 视口 | 底栏高度 | 横向溢出 | 结果 |
|---|---:|---:|---:|---|
| 第 4 步三按钮 | 320×568 | XXpx | 0px | 通过 |
| 第 5 步三按钮 | 390×844 | XXpx | 0px | 通过 |
| 横屏 | 844×390 | XXpx | 0px | 通过 |

### 自动化
- typecheck：通过/失败（原因）
- component contract：通过/失败（原因）
- mobile preview：通过/基础设施阻塞/失败（原因）
- diff check：通过/失败（原因）

### 文件
- 修改：...
- 未修改的受保护文件：tests/**、docs/quality/**、release.generated.ts

### 未决问题
- 无；或逐条列出，并注明是否影响发布。
```

## 20. 最终验收原则

本轮最终判定以“真实手机视口下的可用性和视觉一致性”为准。自动化测试是必要条件，不是充分条件。

以下情况即使测试全绿，也必须判定未完成：

- 按钮看起来仍然像随机排列。
- 三按钮仍占据三分之一屏幕。
- 禁用文案与页面状态矛盾。
- 主操作在不同页面忽左忽右。
- 标题出现孤字或训练说明挤成窄列。
- 固定底栏遮住最后一个问题、输入框或结果。
- 页面只有在开发者工具模拟器中看似正常，真实浏览器交互却无法完成。

实现者应把这份方案当作施工合同：先统一语义，再统一布局，最后逐页校准；不得用局部覆盖换取表面上的短期正常。
