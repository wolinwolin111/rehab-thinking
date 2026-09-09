# 患者手机端 UI 二期整改复核与返修交接单

> 日期：2026-09-09  
> 复核对象：`86ccd2f`（`main` / `origin/agent/dev-20260901`）  
> 依据：`mobile-ui-remediation-phase2-execution-plan-2026-09-08.md`  
> 结论：**暂不通过视觉验收，需要返修后再次复核**  
> 交接对象：继续整改的开发模型或开发者  
> 本文只定义表现层返修任务，不改变产品流程、临床规则或测试文件权属。

## 0. 给接手模型的直接指令

接手后按以下顺序执行，不要跳步：

1. 阅读本文全文。
2. 阅读 `docs/README.md` 和 `docs/handover/mobile-ui-remediation-phase2-execution-plan-2026-09-08.md`。
3. 运行 `git status --short`，不得覆盖、还原或重写用户已有改动。
4. 先修 R-01、R-02、R-03 三个 P1 问题。
5. 再修 R-04、R-05、R-06 三个 P2 问题。
6. R-07 属测试侧任务：开发模型只能登记测试需求，不能修改 `tests/**`。
7. 每修完一个问题，分别在 320×568、390×844、844×390 下复核。
8. 最后必须检查真实浏览器视觉效果，不能只看 DOM 数量、元素高度或测试是否通过。
9. 没有完成本文“完成定义”中的全部项目，不得宣称整改完成。

## 1. 本次复核范围与证据

### 1.1 已复核内容

- 第 1–6 步患者端页面。
- 320×568、390×844、844×390 三个关键视口。
- 固定底部单按钮、双按钮和三按钮操作区。
- 第 1 步引导流程与初始症状描述页面。
- 第 4 步处理结果与双侧出口代码。
- 第 5 步训练卡和训练反馈操作区。
- 第 6 步首次总结卡和保存操作区。
- 200% 证据截图；该证据的测试方法存在限制，见 R-06。
- 动作角色标记、固定栏测量逻辑、旧 CSS 特异性和媒体查询。
- 移动浏览器预览测试的实际覆盖范围。

### 1.2 使用的代码与截图证据

关键代码：

- `src/features/rehabmind/styles/mobile-patient.css`
- `src/features/rehabmind/styles/complete-demo.css`
- `src/features/rehabmind/styles/rm-visual-theme.css`
- `src/features/rehabmind/components/stages/symptom-stage.tsx`
- `src/features/rehabmind/components/stages/treatment-retest-stage.tsx`
- `src/features/rehabmind/components/stages/summary-stage.tsx`
- `src/features/rehabmind/components/shared/ui-primitives.tsx`
- `tests/browser/mobile-preview/mobile-preview.spec.ts`，只读检查

本地截图：

- `outputs/mobile-phase2/after/320x568/`
- `outputs/mobile-phase2/after/390x844/`
- `outputs/mobile-phase2/after/844x390/`

其中最关键的失败证据：

- `390x844/step6-summary.png`：总结卡白底白字、信息接近不可见。
- `844x390/step6-summary.png`：横屏仍显示旧深色渐变卡。
- `390x844/step1-initial.png`：Toast 覆盖“继续”按钮。
- `320x568/step1-answered.png`：引导完成状态重复且使用警示色。
- `320x568/step6-zoom200.png`、`390x844/step6-zoom200.png`：现有 200% 证据不能证明无重叠。

### 1.3 自动化结果

本次复核运行结果：

| 检查 | 结果 | 说明 |
|---|---|---|
| `npm run typecheck` | 通过 | TypeScript 无错误 |
| `tests/component/mobile-app-shell-contract.test.mjs` | 4/4 通过 | 只证明壳层字面合同 |
| `test:browser:mobile-preview` | 2/2 通过 | 设置本地 `NO_PROXY` 后通过，但只覆盖第 1 步 |
| `git diff --check` | 通过 | 工作树保持干净 |
| `check:boundaries` | 失败 | 5 条历史 stage import-type 违规，与本轮 UI 改动无新增关系 |

重要结论：自动化通过不等于视觉通过。当前的第 4、6 步缺陷都没有被移动预览套件发现。

## 2. 已经正确完成的部分

以下成果应保留，不要在返修时推翻：

1. 固定栏高度反馈循环已经消除。
2. `--rm-mobile-action-height` 已不再作为固定栏自身的 `min-height`。
3. 禁用按钮的通用 `::after` 伪文案已删除。
4. 患者 v2 已不再命中 `.rm-page-actions > button:first-child` 的旧顺序规则。
5. 常规三按钮栏在 320px 下已经从约 179px 降至 111–119px。
6. 三按钮常规场景已经形成“两次操作在第一行、主操作独占第二行”。
7. 第 5 步训练说明已从 88px 窄标签列改为上下堆叠。
8. 320px 和 390px 常规流程未观察到页面级横向滚动。
9. 第 3 步标题容器已经增加 `min-width: 0`、`flex: 1` 和换行保护。
10. 默认患者入口继续隐藏 Dev Tools。

返修必须是增量修正，不能恢复旧深色大卡、三行按钮或统一禁用伪文案。

## 3. 文件与业务边界

### 3.1 本轮允许修改

- `src/features/rehabmind/styles/mobile-patient.css`
- `src/features/rehabmind/styles/complete-demo.css`
- `src/features/rehabmind/styles/rm-visual-theme.css`，仅在确需清理共享旧主题时修改
- `src/features/rehabmind/components/stages/symptom-stage.tsx`
- `src/features/rehabmind/components/stages/treatment-retest-stage.tsx`
- `src/features/rehabmind/components/stages/summary-stage.tsx`
- `src/features/rehabmind/components/shared/ui-primitives.tsx`
- `src/features/rehabmind/components/workbench/rehabmind-workbench.tsx`，原则上无需再改，除非发现测量回归

### 3.2 不允许修改

- `tests/**`
- `docs/quality/**`
- `src/infrastructure/pilot/release/release.generated.ts`
- `artifacts/**`
- `scripts/quality/inspect-local.mjs`
- 临床候选、排序、剂量、安全阈值、停止条件和转介规则
- 快照结构、IndexedDB、API、同步、案例身份和会话身份

如测试断言需要迁移，只在交接报告登记，由测试侧处理。

## 4. 返修问题总表

| 编号 | 级别 | 问题 | 影响 | 主要文件 |
|---|---|---|---|---|
| R-01 | P1 | 浅色总结卡仍继承深色主题内容 | 第 6 步关键信息不可读，横屏风格回退 | `mobile-patient.css`、`rm-visual-theme.css` |
| R-02 | P1 | 双侧出口可能生成四按钮并重叠 | 患者看不到或点不到安全出口 | `treatment-retest-stage.tsx`、`mobile-patient.css` |
| R-03 | P1 | Toast 固定在底栏上方错误位置 | 覆盖主按钮，短时间内阻断点击 | `complete-demo.css`、`mobile-patient.css` |
| R-04 | P2 | 第 1 步仍有重复的警示色完成状态 | 成功信息被表达成警告，页面割裂 | `symptom-stage.tsx`、`complete-demo.css` |
| R-05 | P2 | 阶段过渡按钮继续依赖 `first-child` 倒序 | 主操作在上、返回在下，顺序不一致 | `ui-primitives.tsx`、`complete-demo.css` |
| R-06 | P2 | 200% 验收方法不正确且证据存在重叠 | 当前不能宣称大字号通过 | 复核脚本/人工验收流程 |
| R-07 | P2 | 移动预览只覆盖第 1 步 | 第 4、6 步回归无自动守护 | `tests/browser/mobile-preview/**`，测试侧 |
| R-08 | P2 | 单一前进动作被标为 secondary | 唯一可继续动作视觉权重不足 | `treatment-retest-stage.tsx` |

## 5. R-01：完整收口第 6 步浅色总结卡

### 5.1 现象

390×844 首次总结页中：

- “本次动作变化”标签对比度很低。
- 动作名称、初始状态和复查结果接近白色，落在白色卡片上几乎不可见。
- 卡片底部仍保留旧主题的紫色模糊圆形。

844×390 横屏中：

- 整张总结卡重新显示旧深蓝渐变。
- 与患者端浅色任务主题不一致。

### 5.2 根因

`mobile-patient.css:793–811` 只覆盖了：

- 普通 `span`
- `h2`
- `p`
- `.rm-final-score` 的部分元素

但旧主题仍有：

```css
.rm-session-hero::after { ...紫色模糊圆形... }
.rm-chief-action-summary > span { color: #d7dcff !important; }
.rm-chief-action-summary > ul li { color: #fff; }
.rm-chief-action-summary > p { color: #cbd7dd; }
.rm-function-action-summary > ul li small { color: rgba(255,255,255,.78); }
.rm-function-action-summary > ul li em { color: #d7fff3; }
```

浅色覆盖没有处理这些后代选择器，其中标签还带 `!important`。

此外，浅色总结卡规则只位于 `@media (max-width: 720px)`，844px 宽的手机横屏不命中。

### 5.3 必须修改

1. 将总结卡的患者端规则放入统一手机条件：

```css
@media (max-width: 720px),
  (orientation: landscape) and (max-width: 1024px) and (max-height: 600px) {
  /* summary hero rules */
}
```

2. 在患者 v2 作用域内明确关闭旧伪元素：

```css
.rm-app[data-mobile-ui="v2"] .rm-session-hero::after {
  display: none;
}
```

3. 完整覆盖动作总结内容：

```css
.rm-app[data-mobile-ui="v2"] .rm-chief-action-summary > span {
  color: var(--rm-mobile-primary-deep) !important;
  border-color: #cfd3f2;
  background: var(--rm-mobile-selected);
}

.rm-app[data-mobile-ui="v2"] .rm-chief-action-summary > ul li,
.rm-app[data-mobile-ui="v2"] .rm-function-action-summary > ul li strong {
  color: var(--rm-mobile-text);
}

.rm-app[data-mobile-ui="v2"] .rm-function-action-summary > ul li small {
  color: var(--rm-mobile-muted);
}

.rm-app[data-mobile-ui="v2"] .rm-function-action-summary > ul li em {
  color: var(--rm-mobile-success);
  background: var(--rm-mobile-success-soft);
}

.rm-app[data-mobile-ui="v2"] .rm-function-action-summary > ul li.is-pending em {
  color: var(--rm-mobile-warning);
  background: var(--rm-mobile-warning-soft);
}
```

4. 将列表分隔线从半透明白色改为 `var(--rm-mobile-line)`。
5. 保证 `.rm-final-score` 位于内容层上方，不被任何装饰层覆盖。
6. 不要通过隐藏动作列表解决对比度问题；所有总结事实必须继续显示。
7. 不改变任何分数、结果或总结文字的业务来源。

### 5.4 验收标准

- 320×568：动作名称、初始结果、复查结果全部可读。
- 390×844：白底上没有白色或接近白色的重要文字。
- 844×390：仍是浅色卡，不恢复深蓝渐变。
- 不再出现紫色模糊圆形。
- 改善用薄荷色，待复查用琥珀色，加重/停止用红色。
- 总结内容不能只靠颜色区分，仍需保留文字标签。
- 使用浏览器开发工具确认关键正文对比度至少达到 4.5:1。

### 5.5 回归风险

`rm-session-hero` 也用于已保存记录和后续康复总结。必须检查：

- 首次总结
- 保存后的总结
- 多动作总结
- 后续第 N 次康复总结
- 改善、未改善、加重三个结果状态

## 6. R-02：修复双侧出口四按钮和网格覆盖

### 6.1 现象

`treatment-retest-stage.tsx:654–674` 中，双侧处理中间检查点调用：

```ts
bilateralCheckpointOptions({
  bilateral: true,
  assessmentComplete: bilateralAssessmentComplete,
  otherSideHasPendingTreatment: true,
  ...
})
```

当 `bilateralAssessmentComplete === false` 时，domain 会返回：

1. `return-other-side-assessment`
2. `low-load-activity`
3. `continue-other-side-treatment`
4. `save-and-continue`

页面却继续使用 `data-action-layout="three"`。

同时“返回另一侧评估”和“进入低负荷基础活动”都被标记为 `secondary`，CSS 将二者同时放到 `grid-area: 1 / 1`，造成重叠。

`treatment-retest-stage.tsx:720–739` 的第二个双侧出口也可能出现两个 secondary 且没有 primary。

### 6.2 不能做的事

- 不能删除 domain 返回的安全出口。
- 不能修改 `bilateralCheckpointOptions` 的业务含义。
- 不能让四个按钮在 320px 下堆成四行。
- 不能给两个按钮相同角色并继续让 CSS 根据角色占用同一槽位。
- 不能通过 `nth-child` 或 JSX 顺序掩盖重叠。

### 6.3 推荐的表现层映射

#### 状态 A：另一侧仍有待处理项

固定底栏保留：

| 角色 | 动作 |
|---|---|
| secondary | 返回另一侧评估 |
| tertiary | 保存，稍后继续 |
| primary | 继续另一侧处理 |

“进入低负荷基础活动”移动到正文的“其他安全选择”区域，仍然可见、可点击，不得删除。

#### 状态 B：双侧评估未完成，且没有另一侧待处理项

固定底栏保留：

| 角色 | 动作 |
|---|---|
| secondary | 返回另一侧评估 |
| tertiary | 保存，稍后继续 |
| primary | 进入低负荷基础活动 |

#### 状态 C：双侧评估已完成

固定底栏保留：

| 角色 | 动作 |
|---|---|
| secondary/tertiary | 保存，稍后继续 |
| primary | 进入正常训练或继续另一侧处理 |

如果只有两个动作，容器必须使用 `split`，不能继续写 `three`。

### 6.4 建议代码结构

不要在 JSX 中让多个条件按钮自由竞争同一个角色。先在组件内形成表现层动作数组：

```tsx
type RailAction = {
  key: string;
  label: string;
  role: "primary" | "secondary" | "tertiary";
  onClick: () => void;
};

const railActions: RailAction[] = /* 根据已有 checkpointOptions 映射 */;
const inlineAlternatives: RailAction[] = /* 超过底栏容量的保留动作 */;
const actionLayout = railActions.length === 1
  ? "single"
  : railActions.length === 2
    ? "split"
    : "three";
```

这只是表现层映射，不允许创建新的持久化业务状态。

### 6.5 验收标准

- 每个可见固定操作区最多 3 个按钮。
- 每个固定操作区恰好一个 primary；纯返回页可以没有 primary。
- 一个 `three` 容器最多各有一个 primary、secondary、tertiary。
- 320、390、844 横屏下不存在按钮覆盖。
- 四个业务出口仍都可以找到并执行。
- 主操作位于最后一行或横屏最右侧。
- 返回、低负荷、继续处理、保存四个回调保持原逻辑。

### 6.6 必测场景

- 双侧评估未完成 + 另一侧有待处理项。
- 双侧评估未完成 + 另一侧无待处理项。
- 双侧评估完成 + 进入正常训练。
- 双侧处理后加重。
- 保存稍后继续。

## 7. R-03：Toast 不得覆盖固定栏或正文主按钮

### 7.1 现象

`complete-demo.css:1459`：

```css
.rm-toast {
  bottom: 64px;
  z-index: 300;
}
```

新固定栏实际高度为 69–120px，因此 Toast 会落在固定栏区域内。

在症状描述初始页面，Toast 也会覆盖正文中的“继续”按钮。截图 `390x844/step1-initial.png` 已直接显示该问题。

### 7.2 必须修改

1. 患者 v2 手机端的 Toast 位置改为基于实测固定栏高度：

```css
.rm-app[data-mobile-ui="v2"] .rm-toast {
  bottom: calc(var(--rm-mobile-action-height, 0px) + 12px);
}
```

2. 页面没有固定栏时，Toast 也要与底部保持至少 12px。
3. Toast 宽度使用受控卡片宽度，不用长文本胶囊：

```css
width: min(calc(100vw - 32px), 360px);
border-radius: 12px;
line-height: 1.45;
white-space: normal;
```

4. 长文字允许换行。
5. Toast 仍可点击关闭，但不得覆盖当前唯一可执行按钮。
6. 打开抽屉或弹窗时，Toast 不得浮在弹层之上干扰操作；根据现有层级决定暂停显示或降低层级。

### 7.3 验收标准

- 初次建案 Toast 不遮挡“继续”。
- 保存总结 Toast 不遮挡“返回训练”和“保存本次记录”。
- 单按钮、双按钮、三按钮栏都保持至少 12px 间距。
- 320、390、844 横屏全部通过。
- 真正的浏览器 200% 缩放下 Toast 不覆盖按钮。
- Toast 消失后页面不跳动。

## 8. R-04：移除第 1 步重复完成提示

### 8.1 现象

引导问题完成后同时显示：

- `.rm-guided-status` 中“信息已完成 / 信息已补充完成”。
- 页面下方 `.rm-intake-actions` 中“症状信息已经够用了”。
- 固定底栏中的“上一步 / 进入关键确认”。

第二条继承 `complete-demo.css:1514` 的棕红色，导致完成状态看起来像警告，并形成孤立文字和大片空区。

### 8.2 必须修改

1. 非“全部信息”引导模式不渲染 `.rm-intake-actions`：

```tsx
{showAllIntakeFields && /* 原安全条件 */ ? (
  <div className="rm-page-actions rm-intake-actions">...</div>
) : null}
```

2. 引导模式只保留 `.rm-guided-status` 和固定 `.rm-guided-nav`。
3. “进入关键确认”继续位于固定栏，不要重新移回正文。
4. 全部信息模式如需显示状态：

- 未完成使用中性或琥珀色。
- 已完成使用薄荷色或主文字色。
- 不再无条件继承旧棕红色。

5. 缺失字段跳转按钮继续只在全部信息模式出现。

### 8.3 验收标准

- 引导完成页只出现一次“信息完成”语义。
- 不再出现孤立的棕红色“症状信息已经够用了”。
- 正文与固定栏之间没有人为制造的大块空白。
- 全部信息模式仍能跳转缺失字段并进入关键确认。

## 9. R-05：阶段过渡卡改用显式动作角色

### 9.1 现象

`complete-demo.css:1350` 仍存在：

```css
.rm-stage-transition-actions button:first-child { order: 2; }
```

`ui-primitives.tsx` 中 DOM 原本是：

1. 返回查看
2. 主操作

该规则把第一个按钮移到主操作之后，最终变成：

1. 主操作
2. 返回查看

这与手机端“纵向主操作位于最底部”的统一阅读顺序相反，也继续依赖子元素位置判断语义。

### 9.2 必须修改

1. 给 `StageTransition` 的两个按钮增加角色：

```tsx
<button data-action-role="secondary" ...>返回查看</button>
<button data-action-role="primary" className="rm-primary" ...>{buttonLabel}</button>
```

2. 删除 `button:first-child { order: 2; }`。
3. 360px 以上横向布局：secondary 左、primary 右。
4. 359px 以下纵向布局：secondary 上、primary 下。
5. 不改变 `onBack`、`onContinue` 和阶段跳转逻辑。

### 9.3 验收标准

- 第 2→3、3→4、4→5、5→6 的过渡卡顺序一致。
- 320px 主操作位于返回按钮下方。
- 横屏主操作位于最右侧。
- CSS 不再使用 `.rm-stage-transition-actions button:first-child` 推断角色。

## 10. R-06：重新执行真实的 125%/200% 验收

### 10.1 当前证据为什么不充分

现有驱动使用：

```js
document.body.style.zoom = "2";
```

这不是完整等价的浏览器页面缩放：

- 媒体查询仍可能按原始视口判断。
- 浏览器字体缩放、布局视口变化和设备像素行为没有被真实模拟。
- 现有截图已经出现 Toast 覆盖操作区，但报告只检查了 `scrollHeight > clientHeight`，因此仍写成“无截断”。

### 10.2 正确方法

至少采用一种真实方法：

1. Edge/Chrome 浏览器页面缩放切换至 125%、200%。
2. Playwright 使用 CDP 设置页面缩放或调整等效 CSS viewport 后重新加载页面。
3. 浏览器无障碍设置中提高默认字体大小，并重新加载。

不要只修改 `body.style.zoom` 后读取横向溢出。

### 10.3 必查内容

- 顶栏 Logo、品牌、本次记录和更多按钮不重叠。
- 阶段标题不被强行压成不可理解的孤字。
- Toast 不覆盖操作区。
- 固定栏按钮允许增高和换行。
- 页面最后一个内容元素可滚动到底栏上方。
- 总结卡全部文字可读。
- 不出现横向页面滚动。

### 10.4 验收口径

“没有 clipped”不能单独判定通过。必须同时满足：

- 不重叠
- 不遮挡
- 不丢失文字
- 可完成操作
- 无二维页面滚动

## 11. R-07：测试侧补充移动回归场景

### 11.1 当前覆盖缺口

`tests/browser/mobile-preview/mobile-preview.spec.ts` 当前只验证：

- 打开产品
- 填写症状描述
- “继续”可用
- 第 1 步无横向溢出
- 教程弹层可打开/关闭

它没有进入第 2–6 步，没有验证本轮整改的核心合同。

### 11.2 权属要求

这是 B 类文件。开发模型不得直接修改 `tests/**`。

开发侧完成生产修复后，应在交接报告中向测试侧提出以下场景：

1. 第 4 步双侧未完成 + 另一侧待处理，断言四个业务出口都可访问且按钮不重叠。
2. 第 4 步普通三按钮，断言角色唯一和布局高度。
3. 第 5 步训练三按钮，断言主操作置底。
4. 第 6 步多动作总结，断言关键文字计算样式不是白色/透明。
5. 844×390 横屏总结，断言背景为浅色且无旧伪元素。
6. Toast 出现时，断言 Toast 与 action rail 的 bounding box 不相交。
7. 真实 200% reflow，断言顶栏、Toast、底栏无重叠。

建议几何断言：

```ts
const toastBox = await page.locator('.rm-toast').boundingBox();
const railBox = await page.locator('.rm-page-actions:visible, .rm-guided-nav:visible').boundingBox();
expect(toastBox!.y + toastBox!.height).toBeLessThanOrEqual(railBox!.y - 8);
```

测试侧还需要使用 axe 或计算样式验证总结文字对比度，不能只做截图存在性断言。

## 12. R-08：修正单一前进动作的角色

### 12.1 现象

`treatment-retest-stage.tsx:802–803`：

```tsx
<div className="rm-page-actions" data-action-layout="single">
  <button data-action-role="secondary">继续检查这些方向</button>
</div>
```

“继续检查这些方向”是当前唯一前进动作，却被标为 secondary，因此呈现为普通白色按钮。

### 12.2 必须修改

改为：

```tsx
<button
  data-action-role="primary"
  className="rm-primary"
  ...
>
  继续检查这些方向
</button>
```

只修改表现角色，不改变 `acceptContinuationSuggestions` 回调。

### 12.3 验收标准

- 唯一前进动作具有主操作视觉。
- 纯“返回处理与复查”“返回本次复查”单按钮可以继续保持 secondary。

## 13. 推荐施工顺序

### 阶段 1：总结卡修复

修改：

- `mobile-patient.css`
- 必要时 `rm-visual-theme.css`

完成 R-01，在三个视口截图确认后再继续。

### 阶段 2：动作出口修复

修改：

- `treatment-retest-stage.tsx`
- 必要的动作栏 CSS

完成 R-02、R-08。必须用双侧场景实测，不能只看单侧 happy path。

### 阶段 3：Toast 修复

修改：

- `mobile-patient.css`
- `complete-demo.css`

完成 R-03，并在初次建案、保存总结、三按钮页面分别触发 Toast。

### 阶段 4：第 1 步与过渡卡收口

修改：

- `symptom-stage.tsx`
- `ui-primitives.tsx`
- `complete-demo.css`
- 必要的移动端 CSS

完成 R-04、R-05。

### 阶段 5：真实大字号与全流程复核

完成 R-06，重新保存截图和几何数据。

### 阶段 6：交接测试侧

不修改 B 类文件。提交测试需求 R-07。

## 14. 每个阶段的验证命令

```powershell
npm run typecheck
git diff --check
```

完成生产修复后：

```powershell
npm run check:boundaries
node --test tests/component/mobile-app-shell-contract.test.mjs
$env:NO_PROXY='localhost,127.0.0.1,::1'
npm run test:browser:mobile-preview
```

说明：当前环境设置了 HTTP 代理但未设置 `NO_PROXY`，直接启动 Playwright webServer 可能等待 120 秒后超时。设置上述 `NO_PROXY` 后，本次复核实际得到 2/2 通过。

不要修改测试来制造通过。`check:boundaries` 当前 5 条历史 import-type 违规应与修复前失败集合对比，不能归因给本轮，也不能忽略任何新增违规。

## 15. 人工验收矩阵

### 15.1 必测视口

| 视口 | 必测内容 |
|---|---|
| 320×568 | 双按钮纵排、三按钮两行、Toast、总结内容 |
| 360×800 | 双按钮由纵向切换为横向的边界 |
| 390×844 | 主流手机全流程 |
| 412×915 | Android 常用尺寸 |
| 430×932 | 当前手机维护上限 |
| 844×390 | 横屏底栏和浅色总结卡 |

### 15.2 页面矩阵

| 页面 | 必测状态 |
|---|---|
| 第 1 步 | 初始 Toast、引导完成、全部信息、缺失字段 |
| 第 2 步 | 未完成禁用、完成过渡卡 |
| 第 3 步 | 长标题、评估完成过渡卡 |
| 第 4 步 | 单按钮、普通三按钮、双侧四出口、加重出口 |
| 第 5 步 | 训练三按钮、完成过渡卡、加重出口 |
| 第 6 步 | 多动作总结、单动作总结、保存 Toast、后续康复 |

### 15.3 每屏检查

- [ ] 页面级横向溢出为 0。
- [ ] 没有通过 `overflow-x: clip` 隐藏关键内容。
- [ ] 可见固定操作区最多一个。
- [ ] 固定操作区最多三个按钮。
- [ ] 每个推进型操作区恰好一个 primary。
- [ ] 不存在按钮重叠。
- [ ] Toast 不与任何按钮 bounding box 相交。
- [ ] 总结卡所有事实可读。
- [ ] 主操作在纵向最后一行或横向最右侧。
- [ ] 页面最后一个内容元素可滚动到底栏上方至少 16px。
- [ ] 抽屉打开后底栏不可点击。
- [ ] 真实 125%/200% 下无覆盖、截断和二维滚动。

## 16. 禁止的返修方式

接手模型不得：

1. 在 `mobile-patient.css` 文件末尾再追加一个“最终修复”覆盖区。
2. 只提高选择器特异性而不清理旧冲突语义。
3. 使用 `first-child`、`last-child` 或 `nth-child` 决定动作角色。
4. 隐藏总结内容来解决白底白字。
5. 删除双侧安全出口来减少按钮数量。
6. 修改 domain 返回选项或临床门禁。
7. 把四按钮压成四行固定在屏幕底部。
8. 让两个按钮继续共享同一个 `data-action-role` 网格槽。
9. 把 Toast 字号缩小到不可读来避免覆盖。
10. 使用 `body.style.zoom=2` 作为唯一 200% 验收证据。
11. 修改 `tests/**`、`docs/quality/**` 或生成发布文件。
12. 只报告测试通过，不提交真实截图。

## 17. 完成定义（DoD）

以下全部满足才允许提交复核：

- [ ] R-01：竖屏总结卡无白底白字。
- [ ] R-01：横屏总结卡保持浅色主题。
- [ ] R-01：旧紫色模糊伪元素已移除。
- [ ] R-02：双侧四个业务出口全部可访问。
- [ ] R-02：固定栏最多三个按钮且无重叠。
- [ ] R-02：每个推进状态只有一个 primary。
- [ ] R-03：Toast 在所有固定栏上方至少留 12px。
- [ ] R-03：Toast 不遮挡正文“继续”按钮。
- [ ] R-04：引导完成状态只出现一次。
- [ ] R-04：成功状态不再使用棕红警示色。
- [ ] R-05：阶段过渡卡不再使用 first-child 排序。
- [ ] R-05：320px 主操作位于返回按钮下方。
- [ ] R-06：真实浏览器 125%/200% 已人工复核。
- [ ] R-08：唯一前进动作使用 primary。
- [ ] 320、360、390、412、430px 均无横向页面滚动。
- [ ] 844×390 可完成操作。
- [ ] `npm run typecheck` 通过。
- [ ] `git diff --check` 通过。
- [ ] 移动壳组件合同无新增失败。
- [ ] 移动预览无新增失败。
- [ ] 未修改 B 类文件或任何临床决策规则。
- [ ] 已提供修复后截图和底栏/Toast 几何数据。
- [ ] 已向测试侧登记 R-07 的新增回归需求。

## 18. 返修完成后的交接模板

```markdown
### 修复提交
- SHA：
- 修改文件：

### 问题完成情况
- R-01：完成/未完成，证据：
- R-02：完成/未完成，证据：
- R-03：完成/未完成，证据：
- R-04：完成/未完成，证据：
- R-05：完成/未完成，证据：
- R-06：完成/未完成，证据：
- R-07：已登记给测试侧/未登记：
- R-08：完成/未完成，证据：

### 几何实测
| 场景 | 视口 | rail 高度 | Toast 与 rail 间距 | 重叠元素数 | 横向溢出 |
|---|---:|---:|---:|---:|---:|
| 第 4 步双侧出口 | 320×568 | | | | |
| 第 4 步普通三按钮 | 390×844 | | | | |
| 第 6 步总结 | 390×844 | | | | |
| 第 6 步横屏 | 844×390 | | | | |

### 自动化
- typecheck：
- diff check：
- component contract：
- mobile preview：
- boundaries 与修复前差集：

### 真实浏览器
- 125%：
- 200%：
- 320/360/390/412/430：
- 844×390：

### 测试侧请求
- 已登记的 R-07 场景：

### 未决问题
- 无；或逐条列出。
```

## 19. 最终判定原则

本轮返修不是“继续调一点 CSS”，而是完成三个闭环：

1. 浅色主题必须连内容一起迁移，不能只换容器背景。
2. 动作角色必须和真实分支数量一致，不能只给按钮批量加属性。
3. 浮层必须感知动态底栏，不能继续依赖旧的固定像素位置。

只要仍存在白底白字、双侧按钮覆盖或 Toast 遮挡主按钮中的任意一项，就必须判定视觉验收失败，即使 typecheck、组件合同和移动预览全部通过。
