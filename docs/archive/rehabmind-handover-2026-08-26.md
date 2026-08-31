# RehabMind 项目交接文档

> **归档（2026-09-01）**：本档为放错目录（quality/）的 dev 批次交接，内容与 [HANDOVER.md](../handover/HANDOVER.md) 及质量整改登记表重复。当前测试侧口径见 [测试工作总交接](../handover/test-workflow-continuation-handoff.md)。

更新日期：2026-08-26

## 一、已完成的优化整改

### 1.1 批次概览

| 批次 | 提交 | 主要内容 | 状态 |
|---|---|---|---|
| D 批 | `4aff9d8` | DEF-CONSENT-01 加固（四层防御：IDB 超时、onblocked/onabort、建案 15s 超时、同意先落盘） | ✅ 已完成 |
| A 批 | `4845217` | A 系列（DATA/SAVE/BIL/TENS/PRIV/SEC/REL/SCHEMA/SYNC/DB/INVITE/REL-03/ARCH） | ✅ 已完成 |
| B 批 | `45fc54b` | B0-B6（仓库结构迁移、目录治理） | ✅ 已完成 |
| C 批 | `f1b730b` | C 系列（测试层级、发布门禁、观测增量） | ✅ 已完成 |
| DEF 批 | `5423d80` | DEF-CONSENT-01 关门时机前移（POST 201 瞬间关门 + 后台持久化） | ✅ 已完成 |
| E 批 | `d3621ce` | T-05（就医预警卡）、M-07（needsConfirmation 门控）、M-05（MarkingSideHint 清理按钮） | ✅ 已完成 |
| F 批 | `3c0dc7d` | T-03（复查红旗两问）、T-06（覆写溯源 + 矛盾提醒卡） | ✅ 已完成 |
| G 批 | `878a822` | T-07（主诉部位比对提醒卡）、T-08（归档历史 + 首次总结页档案卡） | ✅ 已完成 |
| 测试会话 | `a805361` | 合同适配 B~G 批 + 守卫 DEF + 视觉道稳定 → **test:fast 全绿** | ✅ 已完成 |
| 触诊图 | `cc2ae08` | 小腿触诊图双半拼图（左正面右背面）、后侧高亮块坐标修正 | ✅ 已完成 |
| H 批 | `92fc130` | S-01~S-07（膝决策输入侧别、标记数据流、双侧活动度、感觉异常、去重键、主诉目标侧别、复测结果映射） | ✅ 已完成 |

### 1.2 关键技术决策

#### DEF-CONSENT-01 两层根因修复

**第一层：IDB 写入挂起**
- 问题：IndexedDB 写入间歇挂起，导致同意门永远不关闭
- 修复：四层防御
  1. `withIdbTimeout` 3s 超时 + onblocked/onabort 处理
  2. 建案 15s 超时
  3. 同意先落盘再关门
  4. 静态导入避免 HMR 陈旧变量

**第二层：persistLocalRecords 阻塞关门**
- 问题：`await persistLocalRecords` 阻塞关门 ~110ms
- 修复：改为 `void persist().catch()` 后台执行，关门时机前移到 POST 201 返回瞬间
- 验证：高频轮询 100ms×12 次，修复前 12/12 确定性复现，修复后 10/10 首拍即关

**探针伪影定性**：inspect-local 报错标题为"未知"（计数到无 h1/h2 的空壳元素）= 探针伪影，非真实缺陷

#### 视觉基线漂移

- 320/360px 3%~3.6% 漂移 = Google Fonts 外链网络抖动
- globals.css 已还原保留外链，产品决策去留后重拍基线
- 与 DEF 缺陷无关

#### 触诊图视角修复

- 小腿触诊图双半拼图：左半图为正面，右半图为背面
- `view="back"` 时 `<image x={-768}>` 切右半
- 后侧高亮块用背面半图内坐标 `{x:287, y:188, w:166, h:368}`
- 前/外/内保持正面（胫骨腓骨边缘正面可见，与卡片文案一致）

#### H 批膝决策输入改造

- **S-01**：KneeWorkflowAssessment 增侧别字段 + workbench 逐项传入 + adapter 按自身侧别归属
- **S-02**：快照携带结构化标记 swellingMarks/tendernessMarks，按侧分组生成事实
- **S-03**：passive unsure/unable 生成 unknown 事实不再静默丢弃
- **S-04**：书面确认职责划分——pilot 层 selfNeuralReferral 出口卡兜底
- **S-05**：删除恒假 startsWith 死分支，dedupKey 按 treatmentKey 中文侧前缀解析
- **S-06**：target:chief 侧别只跟随 intake.prioritySide
- **S-07**：outcomeValues 全枚举覆盖含 worse 双维度映射

### 1.3 变异覆盖

| 变异 ID | 描述 | 结果 |
|---|---|---|
| MUT-KNEE-01 | 侧别压平（KneeWorkflowAssessment.side 被清空） | 已杀死 |
| MUT-KNEE-02 | dedupKey 忽略记录侧（所有记录用同一 key） | 已杀死 |
| MUT-FRET-05 | 功能恶化不停（complete→unable 不触发加重即停） | 已杀死 |

### 1.4 测试状态

- `test:fast`：**exit=0 全绿**（a805361 合同适配后无预期红）
- `walkthrough`：22/22 通过
- `tsc`/`eslint`：干净
- knee 三测试文件：68/68
- 变异脚本：`verify-logic-mutations.mjs` 可复用（拼包加载模式）

---

## 二、GP9HC8SD 案例分析

### 2.1 案例基本信息

- 案例编码：GP9HC8SD
- 运行环境：localhost:3000（主开发服务器）
- 创建时间：2026-08-26T12:22:21.451Z
- 最后更新：2026-08-26T12:23:43.959Z

### 2.2 服务器事件

```
case_events:
  seq=1 type=case_created     at=12:22:21
  seq=2 type=intake_confirmed  at=12:23:00  queueLength=0
  seq=3 type=assessment_completed at=12:23:43  queueLength=1
```

**关键发现**：评估完成后治疗队列只有 1 个目标（queueLength=1），不是中途跳过。

### 2.3 9 项评估结果分类

| 出口 | 内容 | 数量 | 说明 |
|---|---|---|---|
| 治疗队列 | 大腿前侧肌群轻柔松解 | 1 | ✅ 已完成 |
| 训练阶段 | 股四头肌伸膝能力检查 + 台阶下降控制检查 | 2 | 力量/控制不进治疗队列 |
| 后续观察 | 局部肿胀 + 局部按压痛 | 2 | 肿胀/压痛由系统判定为观察 |
| 不相关 | 小腿后侧肌群按压反应更明显 | 1 | 与膝关节主诉活动方向无关 |
| 主诉活动受限 | 伸直AROM + 屈曲AROM + 屈曲AROM活动不适 | 3 | 已由上述处理覆盖 |

### 2.4 为什么只有 1 项治疗？

系统生成治疗候选时（`build-trial-targets-core.ts:275-298`），会检查每处肌肉紧张是否与主诉活动受限方向直接相关：

- **大腿前侧肌群** → 相关方向包含"伸直"（与主诉伸直AROM受限匹配）→ ✅ 进入治疗队列
- **小腿后侧肌群** → 相关方向是踝关节动作（背屈/跖屈），与膝关节伸直/屈曲无关 → ❌ 被过滤掉

**这是系统设计的正确行为，不是跳过。**

---

## 三、剩余待整改项

### 3.1 M-04 | P2 | 力量 finding 标题硬编码

**文件**：`src/features/rehabmind/components/workbench/rehabmind-workbench.tsx:1333`

**现状**：单侧模式下力量 finding 标题硬编码"患侧力量偏弱"，但 `result.worseSide` 已记录实际侧别。

**改法**：
```typescript
// 现状
title: result.simple === "weak" 
  ? `${bilateralSide}${item.title}：${isMidlineStrength ? "控制或耐力不足" : intake.side === "双侧/中间" ? "力量偏弱" : "患侧力量偏弱"}` 
  : ...

// 改为
const sideLabel = intake.side === "双侧/中间" 
  ? "力量偏弱" 
  : `${result.worseSide ?? "患侧"}力量偏弱`;
title: result.simple === "weak" 
  ? `${bilateralSide}${item.title}：${isMidlineStrength ? "控制或耐力不足" : sideLabel}` 
  : ...
```

**验证**：单侧模式标记左侧不适 → 标题显示"左侧力量偏弱"

### 3.2 T-09 | P2 | 快照时间陈旧性

**文件**：
- `src/features/rehabmind/components/workbench/rehabmind-workbench.tsx:4008-4038`（恢复逻辑）
- `src/domain/rehab/intake/chief-action-core.ts:142-143`（`isAcuteTrauma` 判断）

**现状**：快照恢复时直接用冻结的旧 `intake.onset` 值，`isAcuteTrauma` 不考虑时间差。

**改法**（方案 B — 提醒用户，不自动改值）：
1. 恢复时计算快照年龄：`Math.floor((Date.now() - new Date(snapshot.createdAt).getTime()) / (1000 * 60 * 60 * 24))`
2. 如果 `snapshotAge > 0` 且 `intake.onset` 是时间敏感值，显示提醒
3. 不自动改 onset 值，提醒用户手动更新

**验证**：创建案例记录"2～7天"，3 天后恢复 → 显示"此案例创建于 3 天前，当前状态可能已变化"

### 3.3 UX-01 | P2 | 可访问性

**涉及文件**：
- `src/features/rehabmind/components/feedback/feedback-panel.tsx`（问题反馈弹层）
- `src/features/rehabmind/components/onboarding/rehabmind-onboarding.tsx`（教程弹层）
- `src/features/rehabmind/components/navigation/mobile-app-navigation.tsx`（移动端抽屉）

**现状问题**：
1. 无焦点陷阱：Tab 可以跳出弹层到背景元素
2. ESC 关闭不完整：教程有 ESC，反馈弹层没有
3. 焦点恢复缺失：关闭后焦点丢失

**改法**：创建通用 `useDialogAccessibility` hook，添加焦点陷阱、ESC 关闭、焦点恢复

**验证**：纯键盘操作打开弹层 → Tab 循环 → ESC 关闭 → 焦点回到触发按钮

### 3.4 TEST-03 | P1 | 随机测试

**现状**：随机测试只验证简化状态模型，不驱动真实页面。

**改法**：改为通过真实可见控件运行，失败保存随机种子、操作轨迹、截图。

**需要测试会话协作排期。**

### 3.5 TEST-10 | P1 | 跨浏览器

**现状**：Firefox 冒烟只覆盖早期页面。

**改法**：Firefox 至少覆盖一个完整高风险流程和关键交互。

**需要测试会话协作排期。**

---

## 四、环境与工具笔记

### 4.1 开发环境

- 主工作树：`D:\Study\codex\project\rehab-thinking-demo`（main 分支）
- 测试会话 worktree：`D:\Study\codex\project\rehabmind-agent`（:3001）
- 技术栈：vinext + React 19 + TypeScript + better-sqlite3
- 数据库：`./data/rehabmind.sqlite`（主库）、浏览器 IndexedDB（本地状态）

### 4.2 已知坑位

1. **PowerShell 中文乱码**：管道命令会毁中文，改用 Edit 工具或 node 按 UTF-8 行替换
2. **变异脚本 data-URL 别名**：`load()` 的 data-URL 无法解析 `@/` 别名，需按场景测试方式拼包
3. **vinext 单实例锁**：每次大验证前重启全新服务器防 HMR 陈旧变量
4. **快照与浏览器状态**：服务器快照只保存创建时的空壳，完整状态在浏览器 IndexedDB

### 4.3 测试命令

```bash
npm run test:fast          # 核心逻辑（全绿）
npm run test:workflow      # 工作流
npm run test:component     # 组件
npm run test:integration   # 集成
npm run test:vertical      # 纵向
npm run test:release       # 发布
npm run walkthrough        # 官方走读 22/22
npm run check:types        # TypeScript
npm run check:lint         # ESLint
```

### 4.4 整改登记表位置

- 主登记表：`docs/quality/rehabmind-quality-remediation-register.md`
- 本交接文档：`docs/quality/rehabmind-handover-2026-08-26.md`

---

## 五、下一步行动

1. **立即可做**：M-04（力量 finding 标题修复，1 行改动）
2. **中等复杂度**：T-09（快照时间提醒）、UX-01（可访问性 hook）
3. **需协作**：TEST-03（随机测试）、TEST-10（跨浏览器）→ 与测试会话排期

工作树状态：仅 `release.generated.ts` 脏（按纪律不入库）。
