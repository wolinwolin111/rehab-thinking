# 定性请求单答复（对应 determination-request-2026-08-26.md）

答复日期：2026-08-26
答复者：开发会话
证据基线：主仓库 main @ b320ddb 工作树
说明：以下每条按请求单要求给出「有意变更 / 无意回归 / 既定架构」结论及依据；RQ-1～RQ-5 的合同预期更新由测试会话按本答复执行。

## 逐条答复

### RQ-1 价值承诺句迁移

**有意变更** —— cf47910 重写欢迎页文案：价值承诺句由三行文案 grid 首行「把线下康复经验带到这里」承接（`rehabmind-onboarding.tsx:76`），引导卡同步用句（`guide-cards.tsx:12`）；旧长句「把悦舒运动康复的线下经验带到你身边，陪你完成每一次康复」废弃。改版记录见交接文档 §2.2「欢迎页文案：三行文案 grid（过渡→动作→坚持）」。

→ 测试会话动作：`tests/component/first-use-entry-contract.test.mjs:17` 与 `tests/component/save-promise-copy.test.mjs:14` 的旧句断言改为新句及其位置（欢迎页三行 grid 第一行，非仅 guide-cards）。

### RQ-2 顶栏同步状态标签整合

**有意变更 —— 新验收文案表如下（2026-08-26 晚间经产品决策再次修订：移动端正常态同样全面静默，见 RQ-S4）：**

| 状态 | 桌面顶栏 | 移动端 mobileSaveStatus |
| --- | --- | --- |
| idle | 无标签 | 无标签 |
| local-saving / syncing | 无标签 | 无标签 |
| local-saved / synced | 无标签 | 无标签 |
| offline | 网络断开，正在本机保存 | 仅保存在本机 |
| conflict | 待处理冲突 | 保存待处理 |
| error | 本机保存失败 | 保存失败 |

依据：降噪设计为「正常流转静默，仅异常态显示文字」，双端口径一致（此前"移动端保留 未保存/··/✓"的口径已被产品否决——✓ 出现太频繁）。代码出处：`mobile-navigation-core.ts:3-10`、`rehabmind-workbench.tsx:5182` 渲染条件。

→ 测试会话动作：更新 SAVE-01 合同的 `topbarLabels` 数组（save-promise-copy.test.mjs:34）；移动端口径以本表为准（`mobile-navigation-core.test.mjs` 已由开发会话同步更新）。

### RQ-3 atlas-v2 图片引用解禁

**有意变更 —— v2 图为现行素材。** `public/` 实存 6 张 atlas-v2 图（ankle/calf/foot/foot-side/knee/thigh）；`lower-limb-location-picker.tsx` 五大区及足内外侧面视图、`muscle-region-location-picker.tsx` 小腿面均在使用（cf47910 接入）。

→ 测试会话动作：删除 `muscle-region-location-picker.test.mjs:18` 的禁令断言，改为正向校验「picker 源码引用的 `/rehabmind-region-*.png` 必须存在于 public/」。备注：肌肉示意图的大腿分区仍为文字卡兜底（素材未配齐），与人体图引用 thigh-atlas-v2.png 并存，不冲突。

### RQ-4 SSR 首屏不含引导层

**既定架构。** 首用流程四层覆盖（欢迎页/来源/同意/教程）全部依赖 localStorage 状态决定渲染，SSR 无法预知，只能 hydration 后出现；`app/page.tsx` 直接渲染工作台即现状设计。本产品为工具型应用且经 nginx `/RehabMind/` 前缀部署，SEO 非目标。

→ 测试会话动作：把巡检该项从 SSR 断言降级为客户端渲染后断言。

### RQ-5 「问题反馈」入口首屏不可见

**确认为设计意图。** 引导未完成时全屏模态遮罩阻断交互属预期；且反馈面板绑定案例上下文（需 `currentFeedbackRecord.pilotPublicCode`），未创建案例时无反馈对象。release 测试已证明建案后入口可见可用。

→ 测试会话动作：遮挡探针前提改为「创建匿名案例之后」再检测。

### RQ-6 可访问性两项

- **RQ-6a：选 `role="img"` + aria-label。** `.rm-step-progress` 内容为纯装饰进度条（空 `<i>` 元素，`ui-primitives.tsx:127`），整体作图形语义最贴切且改动最小；不采用文本节点方案（会在标题区引入可见冗余文字）。开发会话本批直接修复。
- **RQ-6b：加深前景色（修正提问方向——该页脚是浅色渐变底上的深灰字，提亮前景会加重违规）。** `complete-demo.css:1154` 的 `color:#697489` 加深至 `#56617a` 一档，在最浅背景段复测 ≥4.5:1（12px 小字按正常字号阈值）。背景不动，保持视觉主题。开发会话本批直接修复。

## C-1 / C-2 清理项排期

C-1/C-2：排期到本批次 Phase 0，立即执行（C-1 含 orchestrator.test 两处反向断言同步移除；完成后随定向回归一并回报）。

---

## 补充定性：本批 test:fast 暴露的另外三处基线落差（RQ-S1～S3）

开发会话在本批改动后运行完整门禁，当前失败集合共 6 个测试文件。除 RQ-1～RQ-3 已覆盖的 4 条既有红灯外，另发现 2 个文件 3 处断言属于**上一 UI 会话未走定性流程的有意变更**（均见交接文档 §2.2 记录），现补入定性。本批开发会话自身改动（C-1 死命令删除、role="img"、footer 对比度、肿胀侧别提示）零新增失败。

### RQ-S1 肌肉示意图合同的三处断言过时（muscle-region-location-picker.test.mjs）

**有意变更** —— cf47910 将肌肉示意图重构为单腿照片+分区色块方案（`MUSCLE_ZONE_PATHS` 手绘路径 → `MUSCLE_ZONE_RECTS` 照片像素坐标，新增照片层类 `rm-muscle-location-figure__photo`），大腿暂无素材走文字卡兜底。

→ 测试会话动作（同一文件三处）：
- `:16` `/MUSCLE_ZONE_PATHS/` → 改为 `/MUSCLE_ZONE_RECTS/`
- `:18` 解禁 atlas-v2 引用 → 按 RQ-3 改为「引用图片必须存在于 public/」正向校验
- `:19` 解禁照片层 → 删除该 doesNotMatch 或改为正向断言 `/rm-muscle-location-figure__photo/`

### RQ-S2 同意页数据说明由五条精简为三条（stage-render-contract.test.mjs）

**有意变更** —— 同意页删除两条与欢迎页重复的效果提醒，仅保留免责条目（交接文档 §2.2「同意页只写免责」，产品规范"效果提醒只出现一次"）。

→ 测试会话动作：`:30` 测试名与 `:36` 断言改为 `(html.match(/<li/g) || []).length === 3, "三条免责说明点必须完整"`；其余断言（主标题/勾选锚点/禁用逻辑/拒绝出口）不变且当前仍通过。

### RQ-S3 安全确认恢复全量同屏渲染（information-density-contract.test.mjs）

**有意变更** —— 安全确认/骨性风险从"一次一题"回退为"全量同屏渲染"（交接文档 §2.2，产品验收后的人体工学决定）；当前实现使用 `activeSafetyItems.map` / `boneQuestions.map` 全量渲染。

→ 测试会话动作：`:19-20` 对 `currentSafetyItem`/`currentBoneQuestion` 的存在断言删除；`:21-22` 两条 doesNotMatch 反转为 match（`/activeSafetyItems\.map/`、`/boneQuestions\.map/`）。注意同步核对同文件内依赖"一次一题"前提的其他断言。

### 当前 test:fast 失败全集（供测试会话核对）

| 文件 | 归属 |
| --- | --- |
| first-use-entry-contract.test.mjs | RQ-1 |
| save-promise-copy.test.mjs | RQ-1 test1 + RQ-2 test3 |
| muscle-region-location-picker.test.mjs | RQ-3 + RQ-S1 |
| stage-render-contract.test.mjs | RQ-S2 |
| information-density-contract.test.mjs | RQ-S3 |

以上全部为预期更新事项，无一是本批开发改动引入的回归。

---

## RQ-S4：保存状态全面静默 + 首存横幅移除（2026-08-26 晚间产品决策）

**有意变更** —— 用户反馈"✓ 出现太频繁""桌面点下一步也跳保存提示"后拍板：正常流转全面静默，双端口径一致。

开发会话已实现（随下批提交）：
1. `mobile-navigation-core.ts` mobileSaveStatus：5 个正常态（idle/local-saving/local-saved/syncing/synced）返回空串，仅异常态保留文案；`mobile-navigation-core.test.mjs` 已同步更新（开发会话维护的单元测试）。
2. `mobile-app-navigation.tsx` MobileTopActions：状态为空时只渲染「第N次」，无悬挂分隔符。
3. `rehabmind-workbench.tsx`：**删除 first-save OnceHint**（「已保存，下次打开可以从这里继续。」横幅永久移除）；case-code 提示保留。

→ 测试会话动作（两处合同）：
- `stage-render-contract.test.mjs:148-159` 移动顶栏 8 态断言：正常 5 态改为「只渲染 第N次、无状态文字」，异常 3 态保留文案断言；`:6` 的 oracle 注释同步修订。
- `contextual-tip-contract.test.mjs:20` 删除「已保存，下次打开可以从这里继续。」断言（`:19` 案例编号断言保留）。

**预期影响**：本批提交后 `stage-render-contract` 与 `contextual-tip-contract` 两个文件转红，属本条定性范畴，非回归。

---

## RQ-S5：引导卡整层移除 + 聚焦教程精简为 4 步（2026-08-26 晚间产品决策·B 批）

**有意变更** —— 用户确认引导卡内容与欢迎页/教程大面积重合（卡1 逐字重复欢迎页三行文案），且"保存"主题出现 4 次违反"效果提醒只出现一次"规范。定稿：引导卡连组件带 localStorage 标记彻底删除；聚焦教程由 6 步精简为 4 步（症状输入 → 帮我整理 → 康复流程 → 问题反馈），删除原步 1（你的康复伙伴）与步 5（历史案例）。

开发会话已实现：`guide-cards.tsx` 删除、workbench 插播逻辑移除、`onboarding-steps.ts` 精简、CSS 块清理、`scripts/browser-full-walkthrough.mjs` 断言更新（引导卡 7 断言删除、新增"直达来源渠道/引导卡不存在" 2 断言、教程步标题断言改 4 步口径，总断言数 27 → 22）、`tests/browser/support/export-real-snapshot.mjs` 跳卡逻辑移除。

→ 测试会话动作：
- `stage-render-contract.test.mjs`：删除 `:16` GuideCards 的 loadTsxModule 行与 `:71-75` 附近的引导卡渲染测试整块；如合同中有依赖教程 6 步的断言一并按 4 步修订
- 老用户 `rehabmind-guide-cards-seen` key 残留无害（不再被读取）；`rehabmind-onboarding-v1`（欢迎页已看标记）语义不变

**预期影响**：`stage-render-contract` 在 RQ-S4 基础上继续红（同文件），按 S4+S5 一次性更新后转绿。
