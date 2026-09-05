# RehabMind 动作库批次 0＋1 实现计划（骨架 ＋ 提踵族）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立动作词根共享层与评估/处理/训练三库的骨架，并用「提踵族」17 条记录跑通端到端，证明 schema 够用且渲染结构零变化。

**Architecture:** 新增 `src/knowledge/actions/` 作为内容真源；旧知识文件（`full-demo-content.ts`、`local-limb-regions.ts`）与 `FRIENDLY_ASSESSMENT_COPY` 的对应条目改为**从新库取值**（适配器方式），不改任何消费方组件。校验与黄金文案比对放在 `check:catalog`，不新增 `tests/` 下文件。

**Tech Stack:** TypeScript 5、Next/vinext、Node 22（`--experimental-strip-types`）、Playwright（dev 侧手工验证）、`node:assert` 风格脚本。

## Global Constraints

- 不修改 `tests/**`、`docs/quality/**`、`src/infrastructure/pilot/release/release.generated.ts`、`artifacts/**`、`scripts/quality/inspect-local.mjs`、`docs/handover/test-session-handoff-*`。
- 推送只用 `git push origin main:agent/dev-20260901`，禁止 `git push origin main`。
- 每个任务结束必须 `npx.cmd tsc --noEmit` 无输出（期望：无输出，退出码 0）。
- 运行时零解析：词根插值只发生在模块求值期，产物是成品字符串。
- 名称栏保留专业名词；只有解释栏（怎么做／观察点／退阶／进阶／为什么练）分白话与专业两版。
- 剂量必须是结构化字段，句子中不得出现处方性次数/组数数字（校验规则见 Task 3，等长秒数等动作属性有例外名单）。
- 界面可见文字变更必须逐条对应设计文档 §12 的已锁定决定，不得顺手改。
- **批次 1 只换来源、只改 4 个已批准的剂量值，不改任何措辞。** 每条记录的 `pro` 必须等于该条目现在专业模式实际渲染的文字，`plain` 必须等于现在自助模式实际渲染的文字（含 `plain()` 运行时替换后的结果），数字部分换成 `{dose.*}` 占位。任何"顺便说得更白话"都属于批次 2 以后的内容改动，本批次禁止。
- 临时脚本与快照输出写在仓库外（`D:\Study\codex\project\`），不得留在仓库根目录（`check:structure` 会因 `.tmp-*` 报错）。

## 文件结构

| 文件 | 职责 | 动作 |
|---|---|---|
| `src/knowledge/actions/terms.ts` | 动作词根：叫法唯一所有者 | Create |
| `src/knowledge/actions/types.ts` | 三库记录类型 | Create |
| `src/knowledge/actions/assessment.ts` | 评估库（复测也引用它） | Create |
| `src/knowledge/actions/treatment.ts` | 处理库 | Create |
| `src/knowledge/actions/training.ts` | 训练库 | Create |
| `src/knowledge/actions/resolve.ts` | 插值与语域选择 | Create |
| `src/knowledge/actions/bridge.ts` | 输出旧消费方形状的数据（适配器） | Create |
| `src/knowledge/actions/golden.ts` | 已批准的成品字符串清单 | Create |
| `src/knowledge/actions/validate.ts` | 纯函数校验，返回 issue 列表 | Create |
| `scripts/knowledge/check-action-catalog.ts` | 跑 validate ＋ 黄金比对 | Create |
| `scripts/knowledge/capture-action-baseline.mjs` | 抓提踵族 14 条的迁移前成品文案基线（Task 4 数据来源；后续批次复用） | Create |
| `scripts/knowledge/snapshot-render.mjs` | 结构快照（Playwright，输出到仓库外） | Create |
| `package.json` | 加 `check:catalog`、`snapshot:render` | Modify |
| `src/knowledge/pilot/full-demo-content.ts` | 提踵族条目改取新库值 | Modify |
| `src/knowledge/pilot/local-limb-regions.ts` | 提踵族条目改取新库值 | Modify |
| `src/features/rehabmind/components/workbench/workbench-support.tsx` | `FRIENDLY_ASSESSMENT_COPY` 并入生成项 | Modify |
| `docs/handover/test-notice-2026-09-01-batch-sha-bindings.md` | 通知档第 15 轮 | Modify |

---

## 批次 0：骨架

### Task 1: 词根表与类型

**Files:**
- Create: `src/knowledge/actions/terms.ts`
- Create: `src/knowledge/actions/types.ts`

**Interfaces:**
- Consumes: 无
- Produces: `ACTION_TERMS: Record<ActionTermKey, ActionTerm>`、`type ActionTermKey`、`type ActionTerm = { plain: string; pro: string }`

- [ ] **Step 1: 写 `terms.ts`**

```ts
export type ActionTerm = { plain: string; pro: string };

export const ACTION_TERMS = {
  "heel-raise-standing": { plain: "踮脚尖", pro: "提踵" },
  "heel-raise-seated": { plain: "坐着踮脚尖", pro: "坐位提踵" },
  "heel-raise-single": { plain: "单脚踮脚尖", pro: "单脚提踵" },
  "heel-raise-hold": { plain: "保持", pro: "提踵等长保持" },
  "heel-raise-fast": { plain: "快速踮脚尖", pro: "快速提踵" },
} as const;

export type ActionTermKey = keyof typeof ACTION_TERMS;
```

- [ ] **Step 2: 写 `types.ts`**

```ts
import type { ActionTermKey } from "./terms";

export type Register = "plain" | "pro";
export type LocalizedText = Record<Register, string>;
export type PilotRegionId = "knee" | "ankle-foot" | "thigh-local" | "calf-local";
export type ContentAccess = "self" | "coach" | "therapist";

export type AssessmentEntry = {
  id: string;
  region: PilotRegionId;
  kind: "direction" | "strength" | "function" | "special";
  access: ContentAccess;
  title: LocalizedText;
  actions: ActionTermKey[];
  how: LocalizedText;
  observe: LocalizedText;
  optionSet: string;
  /** plain / pro 两套剂量都必填；键集合必须一致（校验器检查）。 */
  dose: Record<Register, Record<string, string | number>>;
};

export type TreatmentEntry = {
  id: string;
  region: PilotRegionId;
  type: "muscle" | "control" | "joint" | "swelling";
  access: ContentAccess;
  title: LocalizedText;
  actions: ActionTermKey[];
  doText: string;
  retestOf: string;
  dose: Record<string, string | number>;
};

export type TrainingEntry = {
  id: string;
  region: PilotRegionId;
  stage: number;
  actions: ActionTermKey[];
  title: string;
  how: string;
  purpose: string;
  observe: string;
  easier: string;
  harder: string;
  dose: { sets: string; reps: string };
  tags: string[];
  /** full-demo 的 exercise 没有这个字段（体位由 title+how 正则推断）；local-limb 有显式值。 */
  startPosition?: string;
};
```

- [ ] **Step 3: 类型检查**

Run: `npx.cmd tsc --noEmit`
Expected: 无输出，退出码 0

- [ ] **Step 4: 提交**

```bash
git add src/knowledge/actions/terms.ts src/knowledge/actions/types.ts
git commit -m "feat(actions): add action term roots and catalog record types"
```

---

### Task 2: 插值与语域解析

**Files:**
- Create: `src/knowledge/actions/resolve.ts`

**Interfaces:**
- Consumes: `ACTION_TERMS`、`ActionTermKey`（Task 1）
- Produces: `fillTemplate(template: string, dose: Record<string, string | number>): string`、`termText(key: ActionTermKey, register: Register): string`、`renderHow(actions, template, register)`

- [ ] **Step 1: 写 `resolve.ts`**

```ts
import { ACTION_TERMS, type ActionTermKey } from "./terms";
import type { Register } from "./types";

export function termText(key: string, register: Register): string {
  const term = (ACTION_TERMS as Record<string, { plain: string; pro: string }>)[key];
  if (!term) throw new Error(`unknown action term: ${key}`);
  return term[register];
}

/** 把 {heel-raise-standing} 换成对应语域的叫法；{dose.xxx} 原样留给 fillTemplate。 */
export function renderHow(_actions: ActionTermKey[], template: string, register: Register): string {
  const text = template.replace(/\{(?!dose\.)[^}]+\}/g, (whole, token: string) => termText(token, register));
  const leftover = text.replace(/\{dose\.[^}]+\}/g, "").match(/\{[^}]+\}/);
  if (leftover) throw new Error(`unresolved token "${leftover[0]}" in: ${template}`);
  return text;
}

/** 把 {dose.sets} 之类换成剂量值。必须在 renderHow 之后调用。 */
export function fillTemplate(template: string, dose: Record<string, string | number>): string {
  return template.replace(/\{dose\.([^}]+)\}/g, (whole, token: string) => {
    const value = dose[token];
    if (value === undefined) throw new Error(`missing dose: ${token}`);
    return String(value);
  });
}
```

> `renderHow` 保留 `_actions` 形参是为了让调用点保持统一签名；实际替换按模板里出现的词根进行，因此一条记录的句子可以引用未列在 `actions` 里的词根（例如 `calf-back-standing-raise` 的退阶句引用 `heel-raise-seated`）。`actions` 字段的作用是给校验器建索引和查重。

- [ ] **Step 2: 用一次性脚本验证插值**

Run（在仓库根目录，跑完即弃，不留文件）：

```bash
node --experimental-strip-types -e "import('./src/knowledge/actions/resolve.ts').then(m=>{const o=m.renderHow(['heel-raise-standing'],'扶住墙，双脚慢慢{heel-raise-standing}再落下，做{dose.both}次。','plain');const f=m.fillTemplate(o,{both:5});console.log(f);if(f!=='扶住墙，双脚慢慢踮脚尖再落下，做5次。')process.exit(1)})"
```
Expected: 输出 `扶住墙，双脚慢慢踮脚尖再落下，做5次。`，退出码 0

- [ ] **Step 3: 类型检查并提交**

```bash
npx.cmd tsc --noEmit
git add src/knowledge/actions/resolve.ts
git commit -m "feat(actions): add register-aware template resolver for action catalog"
```

---

### Task 3: 校验器与 `check:catalog`

**Files:**
- Create: `src/knowledge/actions/validate.ts`
- Create: `scripts/knowledge/check-action-catalog.ts`
- Modify: `package.json`（scripts 段）

**Interfaces:**
- Consumes: `ACTION_TERMS`、三库数组（Task 4 提供，本任务先接受空数组）
- Produces: `type CatalogIssue = { code: string; entryId: string; detail: string }`、`validateActionCatalog(input: { terms: string[]; assessment: AssessmentEntry[]; treatment: TreatmentEntry[]; training: TrainingEntry[] }): CatalogIssue[]`

- [ ] **Step 1: 写 `validate.ts`**

```ts
import type { AssessmentEntry, TreatmentEntry, TrainingEntry } from "./types";

export type CatalogIssue = { code: string; entryId: string; detail: string };

const DOSE_IN_SENTENCE = /\d+\s*(次|组)|每组|做\s*\d|保持\d+\s*秒/;
/** 句内数字是动作定义本身、不是处方的例外（等长保持的秒数）。 */
const DOSE_EXCEPTIONS = new Set(["ankle-achilles-isometric"]);
const ACCESS = new Set(["self", "coach", "therapist"]);
const REGION = new Set(["knee", "ankle-foot", "thigh-local", "calf-local"]);

export function validateActionCatalog(input: {
  terms: string[];
  assessment: AssessmentEntry[];
  treatment: TreatmentEntry[];
  training: TrainingEntry[];
}): CatalogIssue[] {
  const issues: CatalogIssue[] = [];
  const termSet = new Set(input.terms);
  const assessmentIds = new Set(input.assessment.map((entry) => entry.id));
  const seen = new Map<string, string>();

  const checkCommon = (entry: { id: string; region: string; actions: string[] } & Record<string, any>, library: string) => {
    if (!REGION.has(entry.region)) issues.push({ code: "CAT-BAD-REGION", entryId: entry.id, detail: entry.region });
    if ("access" in entry && !ACCESS.has(entry.access)) issues.push({ code: "CAT-BAD-ACCESS", entryId: entry.id, detail: entry.access });
    for (const key of entry.actions) {
      if (!termSet.has(key)) issues.push({ code: "CAT-MISSING-TERM", entryId: entry.id, detail: key });
    }
    const dedupeKey = `${library}:${entry.id}`;
    if (seen.has(dedupeKey)) issues.push({ code: "CAT-DUPLICATE-ID", entryId: entry.id, detail: library });
    seen.set(dedupeKey, library);
  };

  for (const entry of input.assessment) {
    checkCommon(entry, "assessment");
    // plain/pro 的 dose 键集合允许不同（自助句式和专业句式引用的数字不同），
    // 完整性由 renderHow/fillTemplate 运行时抛错保证，这里不做键集合比对。
    if (!DOSE_EXCEPTIONS.has(entry.id)) {
      for (const register of ["plain", "pro"] as const) {
        if (DOSE_IN_SENTENCE.test(entry.how[register].replace(/\{dose\.[^}]+\}/g, ""))) {
          issues.push({ code: "CAT-DOSE-IN-SENTENCE", entryId: entry.id, detail: `how.${register}` });
        }
      }
      if (DOSE_IN_SENTENCE.test(entry.observe.plain)) issues.push({ code: "CAT-DOSE-IN-SENTENCE", entryId: entry.id, detail: "observe.plain" });
    }
  }
  for (const entry of input.treatment) {
    checkCommon(entry, "treatment");
    if (!DOSE_EXCEPTIONS.has(entry.id) && DOSE_IN_SENTENCE.test(entry.doText.replace(/\{dose\.[^}]+\}/g, ""))) {
      issues.push({ code: "CAT-DOSE-IN-SENTENCE", entryId: entry.id, detail: entry.doText });
    }
    if (!assessmentIds.has(entry.retestOf)) issues.push({ code: "CAT-BAD-RETEST-REF", entryId: entry.id, detail: entry.retestOf });
  }
  for (const entry of input.training) {
    checkCommon(entry, "training");
    if (!DOSE_EXCEPTIONS.has(entry.id)) {
      if (DOSE_IN_SENTENCE.test(entry.how.replace(/\{dose\.[^}]+\}/g, ""))) issues.push({ code: "CAT-DOSE-IN-SENTENCE", entryId: entry.id, detail: "how" });
      if (DOSE_IN_SENTENCE.test(entry.purpose)) issues.push({ code: "CAT-DOSE-IN-SENTENCE", entryId: entry.id, detail: "purpose" });
    }
    // easier / harder 里允许保留各自的退阶·进阶剂量（如「保持10秒」「每组6个」），
    // 它们是变体处方，不与卡头 sets·reps 同屏，不构成 a70af60 那类自相矛盾。
  }
  return issues;
}
```

- [ ] **Step 2: 类型检查**

Run: `npx.cmd tsc --noEmit`
Expected: 无输出

- [ ] **Step 3: 提交**

```bash
git add src/knowledge/actions/validate.ts
git commit -m "feat(actions): add catalog validation rules for terms, refs and dose placement"
```

> 说明：`check:catalog` 脚本与 npm 入口在 Task 5 建立，因为那时三库与黄金清单才同时存在，脚本第一次运行就能给出真实结论，不需要"预期失败"的步骤。

---

### Task 4: 提踵族数据条目

**Files:**
- Create: `src/knowledge/actions/assessment.ts`
- Create: `src/knowledge/actions/treatment.ts`
- Create: `src/knowledge/actions/training.ts`

**Interfaces:**
- Consumes: Task 1 类型
- Produces: `ASSESSMENT_ENTRIES`、`TREATMENT_ENTRIES`、`TRAINING_ENTRIES`、`ASSESSMENT_BY_ID`、`TREATMENT_BY_ID`、`TRAINING_BY_ID`

- [ ] **Step 0: 抓迁移前成品基线**

Run: `node scripts/knowledge/capture-action-baseline.mjs`
Expected: 输出 `captured 15 lines`，并在 `D:\Study\codex\project\baseline.tmp.txt` 生成基线（14 条记录＋friendly 解析计数 71）。Step 1–3 的每一段模板文字都必须能在基线里逐字找到；找不到的（如本计划编写后基线又变了）以基线为准改模板，不许凭记忆补。

> 该脚本读源码文本（不 import 模块，规避 `@/` 别名与 tsx），`FRIENDLY_ASSESSMENT_COPY` 与 `plain()` 规则在脚本内复刻。知识文件里这些字段再变化时重跑即可。

- [ ] **Step 1: 写 `assessment.ts`（6 条；模板＝基线原文逐字＋`{dose.*}` 占位，不用词根 token）**

> **本批模板规则**：`how`/`observe` 逐字照抄基线（`how.plain`＝FRIENDLY_ASSESSMENT_COPY 现文或 `plain()` 后的知识文本，`how.pro`＝知识库现文），只有数字换成 `{dose.*}`。词根 token（`{heel-raise-standing}` 等）**本批不出现**——因为基线句子的用词（「踮起」「双脚提踵」「踮脚尖」）与词根叫法不完全同形，强行插值会改变可见文字，违反全局约束。词根表在本批只承担"叫法登记"，真正用词根改写句子是批次 2 以后、经 owner 过目的内容改动。
>
> **新增剂量收敛 #5（基线实测发现，待 owner 确认）**：`knee-calf`、`ankle-calf`、`ankle-heel-raise` 自助版「做5次」vs 专业版「10个」。下表 `plain.both` 暂保留 5；owner 确认统一后只改这三处为 10 并同步更新 golden，其余不动。

```ts
import type { AssessmentEntry } from "./types";

export const ASSESSMENT_ENTRIES: AssessmentEntry[] = [
  {
    id: "knee-calf", region: "knee", kind: "strength", access: "self",
    title: { plain: "踮脚力量", pro: "小腿三头肌" },
    actions: ["heel-raise-standing", "heel-raise-single"],
    how: {
      plain: "扶住墙，双脚慢慢踮起再落下，做{dose.both}次。两边都能稳定完成时，再分别用单脚试做。",
      pro: "双脚踮脚尖{dose.both}个；允许时再左右单脚各做最多{dose.each}个。",
    },
    observe: {
      plain: "哪边抬得更低、更容易累，或用力时会不舒服。",
      pro: "高度、节奏、膝是否弯曲及患侧能完成的高质量个数。",
    },
    optionSet: "strength",
    dose: { plain: { both: 5 }, pro: { both: 10, each: 10 } },
  },
  {
    id: "knee-heel-raise", region: "knee", kind: "function", access: "self",
    title: { plain: "双脚提踵", pro: "双脚提踵" },
    actions: ["heel-raise-standing"],
    how: {
      plain: "扶住墙面，双脚同时缓慢抬起脚跟，再慢慢落下，完成{dose.both}次。",
      pro: "扶住墙面，双脚同时缓慢抬起脚跟，再慢慢落下，完成{dose.both}次。",
    },
    observe: {
      plain: "两侧高度是否接近，身体是否晃动，患侧是否明显更难完成。",
      pro: "两侧高度是否接近，身体是否晃动，患侧是否明显更难完成。",
    },
    optionSet: "function",
    dose: { plain: { both: 10 }, pro: { both: 10 } },
  },
  {
    id: "ankle-calf", region: "ankle-foot", kind: "strength", access: "self",
    title: { plain: "踮脚力量", pro: "小腿三头肌 / 提踵" },
    actions: ["heel-raise-standing", "heel-raise-single"],
    how: {
      plain: "扶住墙，双脚慢慢踮起再落下，做{dose.both}次。能稳定完成时，再分别用单脚试做。",
      pro: "先双脚提踵{dose.both}个；稳定后扶墙做单脚提踵，最多记录{dose.each}个高质量次数。",
    },
    observe: {
      plain: "哪边抬得更低、更容易累，或用力时会不舒服。",
      pro: "提踵高度、节奏、膝是否弯曲和患侧耐力。",
    },
    optionSet: "strength",
    dose: { plain: { both: 5 }, pro: { both: 10, each: 10 } },
  },
  {
    id: "ankle-heel-raise", region: "ankle-foot", kind: "function", access: "self",
    title: { plain: "踮脚", pro: "提踵" },
    actions: ["heel-raise-standing", "heel-raise-single"],
    how: {
      plain: "扶住墙，双脚慢慢踮起再落下，做{dose.both}次。",
      pro: "先双脚同步提踵{dose.both}个，再根据耐受做单脚提踵。",
    },
    observe: {
      plain: "两边脚跟抬起的高度是否接近；哪里不舒服；身体是否明显偏向一边。",
      pro: "高度、节奏、足弓、跟腱/小腿症状和高质量次数。",
    },
    optionSet: "function",
    dose: { plain: { both: 5 }, pro: { both: 10 } },
  },
  {
    id: "calf-heel-raise-strength", region: "calf-local", kind: "strength", access: "self",
    title: { plain: "小腿后侧发力", pro: "小腿后侧发力" },
    actions: ["heel-raise-standing"],
    how: {
      plain: "扶墙做{dose.both}次双脚提踵；稳定时再分别单脚尝试。",
      pro: "扶墙做{dose.both}次双脚提踵；稳定时再分别单脚尝试。",
    },
    observe: { plain: "比较高度、个数和症状。", pro: "比较高度、个数和症状。" },
    optionSet: "strength",
    dose: { plain: { both: 10 }, pro: { both: 10 } },
  },
  {
    id: "calf-heel-raise", region: "calf-local", kind: "function", access: "self",
    title: { plain: "提踵", pro: "提踵" },
    actions: ["heel-raise-standing"],
    how: {
      plain: "扶墙做{dose.both}次双脚提踵。",
      pro: "扶墙做{dose.both}次双脚提踵。",
    },
    observe: { plain: "局部症状、高度和左右差异。", pro: "局部症状、高度和左右差异。" },
    optionSet: "function",
    dose: { plain: { both: 10 }, pro: { both: 10 } },
  },
];

export const ASSESSMENT_BY_ID = new Map(ASSESSMENT_ENTRIES.map((entry) => [entry.id, entry]));
```

- [ ] **Step 2: 写 `treatment.ts`（2 条）**

```ts
import type { TreatmentEntry } from "./types";

export const TREATMENT_ENTRIES: TreatmentEntry[] = [
  {
    id: "ankle-medial-control", region: "ankle-foot", type: "control", access: "self",
    title: { plain: "足弓与提踵控制练习", pro: "足弓与提踵控制练习" },
    actions: ["heel-raise-standing"],
    doText: "坐着，用脚趾把地上的毛巾一点点抓向自己，做 {dose.grasp} 次；再扶墙做 {dose.raise} 个双脚踮脚尖。",
    retestOf: "ankle-calf", dose: { grasp: 5, raise: 5 },
  },
  {
    id: "ankle-achilles-load", region: "ankle-foot", type: "control", access: "self",
    title: { plain: "双脚提踵起步", pro: "双脚提踵起步" },
    actions: ["heel-raise-standing"],
    doText: "先确认没有突然断裂的感觉、也没有踩不实的情况，再扶墙做一组{dose.reps}个双脚踮脚尖。",
    retestOf: "ankle-heel-raise", dose: { reps: "5～8" },
  },
];

export const TREATMENT_BY_ID = new Map(TREATMENT_ENTRIES.map((entry) => [entry.id, entry]));
```

- [ ] **Step 3: 写 `training.ts`（6 条；模板＝基线原文逐字＋`{dose.*}` 占位；含剂量收敛 #3）**

> 训练单轨：`how/purpose/observe/easier/harder` 全部逐字照抄基线；只有 `calf-back-standing-raise`、`calf-medial-arch`、`ankle-band-heelraise` 的 reps 按收敛 #3 改为 10～15。full-demo 的三条没有 `startPosition`（体位由 title+how 推断），字段留空不写。`easier/harder` 里的变体剂量（「保持10秒」等）照抄，校验器不查这两个字段（Task 3 已说明理由）。

```ts
import type { TrainingEntry } from "./types";

export const TRAINING_ENTRIES: TrainingEntry[] = [
  {
    id: "knee-calf-raise", region: "knee", stage: 2,
    actions: ["heel-raise-standing"],
    title: "扶墙双脚提踵",
    how: "双手轻扶墙，脚跟垂直抬起，停1秒后缓慢落下。",
    purpose: "小腿力量回来了，走路蹬地才有劲，站立时膝盖也更稳。",
    observe: "两侧高度接近，膝盖保持稳定，脚踝不向内外倒。",
    easier: "坐姿提踵或减少高度。",
    harder: "单脚提踵或增加轻负重。",
    dose: { sets: "3组", reps: "每组10～15个" },
    tags: ["calf", "heel-raise", "gait"],
  },
  {
    id: "calf-back-standing-raise", region: "calf-local", stage: 2,
    actions: ["heel-raise-standing"],
    title: "双脚站姿提踵",
    how: "扶墙站立，两侧脚跟同时抬起，再缓慢落下。",
    purpose: "站直提踵练腓肠肌，蹬地推进的力量从这里开始回到走路里。",
    observe: "两侧高度接近，不向内外歪。",
    easier: "回到坐姿提踵。",
    harder: "进阶单脚提踵。",
    dose: { sets: "3组", reps: "每组10～15个" },
    tags: ["calf-back", "gastrocnemius", "heel-raise"],
    startPosition: "站立",
  },
  {
    id: "calf-medial-arch", region: "calf-local", stage: 2,
    actions: ["heel-raise-standing"],
    title: "足弓保持与提踵",
    how: "站稳，脚趾放松贴地，轻轻踮脚尖再放下。",
    purpose: "小腿内侧和足弓一起练回来，走路时力量才不从小腿内侧漏掉。",
    observe: "脚趾不抠地，脚跟不向外甩，小腿不跟着转。",
    easier: "扶着墙做，只抬一点点。",
    harder: "增加提踵高度。",
    dose: { sets: "3组", reps: "每组10～15个" },
    tags: ["calf-medial", "arch", "heel-raise"],
    startPosition: "站立",
  },
  {
    id: "calf-back-seated-raise", region: "calf-local", stage: 1,
    actions: ["heel-raise-seated"],
    title: "坐姿提踵",
    how: "坐稳，前脚掌踩地，缓慢抬起脚跟再放下。",
    purpose: "膝盖弯着时比目鱼肌才肯出力——这是伤后最早能做的安全负荷。",
    observe: "小腿后侧发力，节奏稳定。",
    easier: "减小高度或个数。",
    harder: "膝上增加轻负重。",
    dose: { sets: "3组", reps: "每组8～12个" },
    tags: ["calf-back", "soleus", "heel-raise"],
    startPosition: "坐位",
  },
  {
    id: "ankle-achilles-isometric", region: "ankle-foot", stage: 1,
    actions: ["heel-raise-hold"],
    title: "坐姿提踵保持",
    how: "坐稳，前脚掌踩地，缓慢抬起脚跟到可接受高度，保持30秒（均匀呼吸不憋气）再轻轻放下。",
    purpose: "跟腱疼痛时静态保持是最安全的负荷：撑满30秒才能真正抑制肌腱痛感，几秒钟只是动一下。",
    observe: "跟腱症状不逐次增加；当天晚些时候和第二天没有持续加重。",
    easier: "减小抬起高度或保持10秒。",
    harder: "保持30秒不变，缩短组间休息，再进入双脚慢速提踵。",
    dose: { sets: "2组", reps: "每组5次" },
    tags: ["achilles", "tendon-loading", "heel-raise", "isometric"],
  },
  {
    id: "ankle-band-heelraise", region: "ankle-foot", stage: 2,
    actions: ["heel-raise-standing"],
    title: "踝四方向弹力带抗阻与提踵",
    how: "按力量缺口选1～2个弹力带方向，再做双脚提踵。",
    purpose: "把弹力带抗阻和提踵拼在一节课里，一次补齐查出来的力量缺口。",
    observe: "动作来自踝足，膝和脚趾不过度代偿。",
    easier: "改为保持不动发力，或扶墙轻轻踮脚尖。",
    harder: "单脚提踵或加轻负重。",
    dose: { sets: "3组", reps: "每项每组10～15个" },
    tags: ["ankle-strength", "calf", "peroneal"],
  },
];

export const TRAINING_BY_ID = new Map(TRAINING_ENTRIES.map((entry) => [entry.id, entry]));
```

> 两个校验例外记进 Task 3 的 `DOSE_EXCEPTIONS`：①`ankle-achilles-isometric`——句内「保持30秒」是等长动作定义本身；②`ankle-band-heelraise`——「选1～2个弹力带方向」的数字是方向选择数，不是处方剂量（校验正则不含 `\d+个`，天然不误报，这里只登记说明）。

- [ ] **Step 4: 直接跑校验器（npm 入口在 Task 5 才建）**

Run: `node --experimental-strip-types -e "Promise.all([import('./src/knowledge/actions/terms.ts'),import('./src/knowledge/actions/assessment.ts'),import('./src/knowledge/actions/treatment.ts'),import('./src/knowledge/actions/training.ts'),import('./src/knowledge/actions/validate.ts')]).then(([t,a,tr,tn,v])=>{const i=v.validateActionCatalog({terms:Object.keys(t.ACTION_TERMS),assessment:a.ASSESSMENT_ENTRIES,treatment:tr.TREATMENT_ENTRIES,training:tn.TRAINING_ENTRIES});console.log(i.length?JSON.stringify(i):'validate ok')})"`
Expected: `validate ok`。若出现 `CAT-DOSE-IN-SENTENCE`，说明某句里还留着次数或组数，改回 `{dose.*}` 占位后重跑。

- [ ] **Step 5: 类型检查并提交**

```bash
npx.cmd tsc --noEmit
git add src/knowledge/actions/assessment.ts src/knowledge/actions/treatment.ts src/knowledge/actions/training.ts
git commit -m "feat(actions): seed heel-raise family entries with converged doses"
```

---

### Task 5: 适配器与黄金文案

**Files:**
- Create: `src/knowledge/actions/bridge.ts`
- Create: `src/knowledge/actions/golden.ts`

**Interfaces:**
- Consumes: Task 4 三库、Task 2 `renderHow`/`fillTemplate`
- Produces:
  - `assessmentPro(id: string): { title: string; how: string; observe: string }`
  - `assessmentFriendly(id: string): { title: string; how: string; observe: string }`
  - `treatmentDo(id: string): string`
  - `trainingCopy(id: string): { how: string; purpose: string; observe: string; easier: string; harder: string; sets: string; reps: string }`
  - `goldenOutputs(): Record<string, string>`

- [ ] **Step 1: 写 `bridge.ts`**

```ts
import { ASSESSMENT_BY_ID } from "./assessment";
import { TREATMENT_BY_ID } from "./treatment";
import { TRAINING_BY_ID } from "./training";
import { fillTemplate, renderHow } from "./resolve";

export function assessmentPro(id: string) {
  const entry = ASSESSMENT_BY_ID.get(id);
  if (!entry) throw new Error(`unknown assessment id: ${id}`);
  return {
    title: entry.title.pro,
    how: fillTemplate(renderHow(entry.actions, entry.how.pro, "pro"), entry.dose.pro),
    observe: entry.observe.pro,
  };
}

export function assessmentFriendly(id: string) {
  const entry = ASSESSMENT_BY_ID.get(id);
  if (!entry) throw new Error(`unknown assessment id: ${id}`);
  return {
    title: entry.title.plain,
    how: fillTemplate(renderHow(entry.actions, entry.how.plain, "plain"), entry.dose.plain),
    observe: entry.observe.plain,
  };
}

export function treatmentDo(id: string) {
  const entry = TREATMENT_BY_ID.get(id);
  if (!entry) throw new Error(`unknown treatment id: ${id}`);
  return fillTemplate(renderHow(entry.actions, entry.doText, "plain"), entry.dose);
}

export function trainingCopy(id: string) {
  const entry = TRAINING_BY_ID.get(id);
  if (!entry) throw new Error(`unknown training id: ${id}`);
  return {
    how: fillTemplate(renderHow(entry.actions, entry.how, "plain"), entry.dose),
    purpose: entry.purpose,
    observe: entry.observe,
    easier: entry.easier,
    harder: entry.harder,
    sets: entry.dose.sets,
    reps: entry.dose.reps,
  };
}

export function goldenOutputs(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const id of ASSESSMENT_BY_ID.keys()) out[`assessment.how:${id}`] = assessmentFriendly(id).how;
  for (const id of ASSESSMENT_BY_ID.keys()) out[`assessment.pro:${id}`] = assessmentPro(id).how;
  for (const id of TREATMENT_BY_ID.keys()) out[`treatment.do:${id}`] = treatmentDo(id);
  for (const id of TRAINING_BY_ID.keys()) out[`training.how:${id}`] = trainingCopy(id).how;
  return out;
}
```

- [ ] **Step 2: 打印实际成品，人工核对后写入 `golden.ts`**

Run: `node --experimental-strip-types -e "import('./src/knowledge/actions/bridge.ts').then(m=>console.log(JSON.stringify(m.goldenOutputs(),null,1)))"`

Expected（逐条核对；这些是迁移后界面应出现的**完整成句**，必须与 Step 1 模板推导结果一致）：

```
assessment.how:knee-calf                扶住墙，双脚慢慢踮起再落下，做5次。两边都能稳定完成时，再分别用单脚试做。
assessment.pro:knee-calf                双脚踮脚尖10个；允许时再左右单脚各做最多10个。
assessment.how:knee-heel-raise          扶住墙面，双脚同时缓慢抬起脚跟，再慢慢落下，完成10次。
assessment.pro:knee-heel-raise          扶住墙面，双脚同时缓慢抬起脚跟，再慢慢落下，完成10次。
assessment.how:ankle-calf               扶住墙，双脚慢慢踮起再落下，做5次。能稳定完成时，再分别用单脚试做。
assessment.pro:ankle-calf               先双脚提踵10个；稳定后扶墙做单脚提踵，最多记录10个高质量次数。
assessment.how:ankle-heel-raise         扶住墙，双脚慢慢踮起再落下，做5次。
assessment.pro:ankle-heel-raise         先双脚同步提踵10个，再根据耐受做单脚提踵。
assessment.how:calf-heel-raise-strength 扶墙做10次双脚提踵；稳定时再分别单脚尝试。
assessment.pro:calf-heel-raise-strength 扶墙做10次双脚提踵；稳定时再分别单脚尝试。
assessment.how:calf-heel-raise          扶墙做10次双脚提踵。
assessment.pro:calf-heel-raise          扶墙做10次双脚提踵。
treatment.do:ankle-medial-control       坐着，用脚趾把地上的毛巾一点点抓向自己，做 5 次；再扶墙做 5 个双脚踮脚尖。
treatment.do:ankle-achilles-load        先确认没有突然断裂的感觉、也没有踩不实的情况，再扶墙做一组5～8个双脚踮脚尖。
training.how:knee-calf-raise            双手轻扶墙，脚跟垂直抬起，停1秒后缓慢落下。
training.how:calf-back-standing-raise   扶墙站立，两侧脚跟同时抬起，再缓慢落下。
training.how:calf-medial-arch           站稳，脚趾放松贴地，轻轻踮脚尖再放下。
training.how:calf-back-seated-raise     坐稳，前脚掌踩地，缓慢抬起脚跟再放下。
training.how:ankle-achilles-isometric   坐稳，前脚掌踩地，缓慢抬起脚跟到可接受高度，保持30秒（均匀呼吸不憋气）再轻轻放下。
training.how:ankle-band-heelraise       按力量缺口选1～2个弹力带方向，再做双脚提踵。
```

> 逐条核对锚点：①六条评估的 `plain` 成品必须与基线抓取的 `guided.how` **逐字一致**（含"做5次"——收敛 #5 未决前不得私自改 10）；②`pro` 成品与基线 `pro.how` 一致；③`calf-heel-raise-strength` 的 10 是收敛 #2 已批准值；④两个 treatment 成品与基线 `do` 逐字一致；⑤六个 training 成品与基线 `how` 逐字一致。任何不一致＝模板抄错，修模板而不是改 golden。

把这份输出**原样**写入 `src/knowledge/actions/golden.ts`（全部 20 个键，逐条照抄，不得省略）：

```ts
export const GOLDEN_OUTPUTS: Record<string, string> = {
  "assessment.how:knee-calf": "扶住墙，双脚慢慢踮起再落下，做5次。两边都能稳定完成时，再分别用单脚试做。",
  "assessment.pro:knee-calf": "双脚踮脚尖10个；允许时再左右单脚各做最多10个。",
  // ……其余 18 个键同上，以 Step 2 实际打印为准
};
```

- [ ] **Step 3: 跑校验**

Run: `npm run check:catalog`
Expected: `action catalog: ok (assessment=6, treatment=2, training=6, golden=20)`，退出码 0

- [ ] **Step 4: 提交**

```bash
git add src/knowledge/actions/bridge.ts src/knowledge/actions/golden.ts
git commit -m "feat(actions): add catalog bridge and golden output baseline"
```

---

### Task 6: 结构快照基线

**Files:**
- Create: `scripts/knowledge/snapshot-render.mjs`

**Interfaces:**
- Consumes: 运行中的 dev server（`http://[::1]:3000/`）
- Produces: `D:\Study\codex\project\snapshot-<label>.txt`（仓库外），内容为逐场景的 DOM 骨架签名（选择器＋顺序＋id，不含可见文字）

- [ ] **Step 1: 写 `snapshot-render.mjs`**

```js
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const OUT_DIR = process.env.SNAPSHOT_DIR ?? "D:/Study/codex/project";
const SCENARIOS = [
  "assessment-all-normal", "custom-action-assessment", "high-irritability-completed-painful",
  "treatment-improved", "function-flare-retest", "outcome-panel-chief-action-line",
  "training-worse", "second-session", "recurrent-flare-chronic", "treatment-worse-stop",
  "bilateral-per-side-retest", "bilateral-longitudinal",
];
const SIGNATURE = `
  .rm-app, .rm-app *
`;

const label = process.argv[2];
if (!label) { console.error("usage: snapshot-render.mjs <label>"); process.exit(1); }

const browser = await chromium.launch();
const out = [];
for (const id of SCENARIOS) {
  const page = await browser.newPage({ viewport: { width: 430, height: 2400 } });
  try {
    await page.goto("http://[::1]:3000/test", { waitUntil: "domcontentloaded" });
    await page.click("text=页面定向");
    await page.waitForTimeout(400);
    await page.click(`[data-testid="test-scenario-${id}"]`);
    await page.click("text=开始测试");
    await page.waitForSelector(".rm-app", { timeout: 20000 });
    await page.waitForTimeout(1200);
    const sig = await page.$eval(".rm-app", (root) => {
      const rows = [];
      for (const el of root.querySelectorAll(".rm-app, .rm-app *")) {
        rows.push([
          el.tagName.toLowerCase(),
          (typeof el.className === "string" ? el.className : "").replace(/\s+/g, "."),
          el.getAttribute("data-candidate-id") ?? "",
          el.getAttribute("data-testid") ?? "",
          el.childElementCount === 0 ? "" : "",
        ].join("|"));
      }
      return rows.join("\n");
    });
    out.push(`===== ${id} =====\n${sig}`);
  } catch (error) {
    out.push(`===== ${id} ===== ERROR ${String(error).split("\n")[0]}`);
  }
  await page.close();
}
writeFileSync(`${OUT_DIR}/snapshot-${label}.txt`, out.join("\n"), "utf8");
console.log(`snapshot ${label}: ${out.length} scenarios`);
await browser.close();
```

- [ ] **Step 2: 加 npm script**

在 `package.json` 的 `"check:catalog"` 之后插入：

```json
    "snapshot:render": "node scripts/knowledge/snapshot-render.mjs",
```

- [ ] **Step 3: 在改动前抓基线**

确认 dev server 在跑（`Invoke-WebRequest http://[::1]:3000/ -UseBasicParsing` 返回 200），然后：

Run: `npm run snapshot:render -- before`
Expected: `snapshot before: 12 scenarios`，生成 `D:\Study\codex\project\snapshot-before.txt`

- [ ] **Step 4: 提交脚本**

```bash
git add scripts/knowledge/snapshot-render.mjs package.json
git commit -m "chore(knowledge): add DOM structure snapshot harness for catalog migration"
```

---

## 批次 1：接线（提踵族）

### Task 7: 评估库接入旧消费方

**Files:**
- Modify: `src/knowledge/pilot/full-demo-content.ts:270、277、392、400`
- Modify: `src/knowledge/pilot/local-limb-regions.ts:90、94`
- Modify: `src/features/rehabmind/components/workbench/workbench-support.tsx:2241` 起的 `FRIENDLY_ASSESSMENT_COPY`

**Interfaces:**
- Consumes: `assessmentPro`、`assessmentFriendly`（Task 5）
- Produces: 无新导出；改变上述条目的运行时取值来源

- [ ] **Step 1: 加 import**

`full-demo-content.ts` 顶部 import 段末尾追加：

```ts
import { assessmentFriendly, assessmentPro } from "@/src/knowledge/actions/bridge";
```

`local-limb-regions.ts` 顶部追加同一行。

- [ ] **Step 2: 替换 4 条膝/踝评估条目**

`full-demo-content.ts:270` 整行替换为：

```ts
    strength("knee-calf", assessmentPro("knee-calf").title, assessmentPro("knee-calf").how, assessmentPro("knee-calf").observe, ["calf", "heel-raise"]),
```

`full-demo-content.ts:277` 整行替换为：

```ts
    functional("knee-heel-raise", assessmentPro("knee-heel-raise").title, assessmentPro("knee-heel-raise").how, assessmentPro("knee-heel-raise").observe, ["heel-raise", "calf", "balance"]),
```

`full-demo-content.ts:392` 整行替换为：

```ts
    strength("ankle-calf", assessmentPro("ankle-calf").title, assessmentPro("ankle-calf").how, assessmentPro("ankle-calf").observe, ["calf", "heel-raise"]),
```

`full-demo-content.ts:400` 整行替换为：

```ts
    functional("ankle-heel-raise", assessmentPro("ankle-heel-raise").title, assessmentPro("ankle-heel-raise").how, assessmentPro("ankle-heel-raise").observe, ["heel-raise", "push-off"]),
```

- [ ] **Step 3: 替换 2 条小腿局部评估条目**

`local-limb-regions.ts:90` 中 `assessment("calf-heel-raise-strength", …)` 调用改为：

```ts
    assessment("calf-heel-raise-strength", assessmentPro("calf-heel-raise-strength").title, "strength", assessmentPro("calf-heel-raise-strength").how, assessmentPro("calf-heel-raise-strength").observe, ["calf-back", "heel-raise"]),
```

`local-limb-regions.ts:94` 中 `assessment("calf-heel-raise", …)` 调用改为：

```ts
    assessment("calf-heel-raise", assessmentPro("calf-heel-raise").title, "function", assessmentPro("calf-heel-raise").how, assessmentPro("calf-heel-raise").observe, ["heel-raise"]),
```

同文件 `:94` 内 `calf-jog` 条目的 how 里「只有走路和提踵稳定时」保持原文不动（引用型，批次 2 处理）。

- [ ] **Step 4: 白话版改由目录供给，并删除被替代的手写条目**

`workbench-support.tsx` 顶部 import 段追加：

```ts
import { assessmentFriendly } from "@/src/knowledge/actions/bridge";
```

两处改动：

1. **删除** `FRIENDLY_ASSESSMENT_COPY` 里已有的三条手写条目（它们的值已原样进入目录，留在原地会形成双份真相）：
   - `:2247` `"knee-calf": { title: "踮脚力量", how: "扶住墙，双脚慢慢踮起再落下，做5次。两边都能稳定完成时，再分别用单脚试做。", observe: "哪边抬得更低、更容易累，或用力时会不舒服。" }`
   - `:2267` `"ankle-calf": { title: "踮脚力量", how: "扶住墙，双脚慢慢踮起再落下，做5次。能稳定完成时，再分别用单脚试做。", observe: "哪边抬得更低、更容易累，或用力时会不舒服。" }`
   - `:2271` `"ankle-heel-raise": { title: "踮脚", how: "扶住墙，双脚慢慢踮起再落下，做5次。", observe: "两边脚跟抬起的高度是否接近；哪里不舒服；身体是否明显偏向一边。" }`
   （行号为编写本计划时的实测值，执行时以内容匹配为准。）
2. 在 `FRIENDLY_ASSESSMENT_COPY` 对象字面量**末尾**追加目录展开：

```ts
  ...Object.fromEntries(
    ["knee-calf", "knee-heel-raise", "ankle-calf", "ankle-heel-raise", "calf-heel-raise-strength", "calf-heel-raise"]
      .map((id) => [id, assessmentFriendly(id)]),
  ),
};
```

完成后全文件 `grep 'knee-calf'` 确认该键只在展开列表里出现一次。

> **本批明确不动的同 id 其他出现点**（都是"同一动作的又一处说法"，属于批次 2+ 的合并对象）：`workbench-support.tsx:1270/1273/1280` 的 friendly 提问句 map（「能不能连续完成10次标准提踵…」——注意这里还有一处 10 次的剂量说法）、`:2287` 的 pro 标题覆盖（「提踵力量（小腿后侧）」）、`rehabmind-workbench.tsx:1425` 的 strength→function 孪生映射。它们不影响本次结构快照。

- [ ] **Step 5: 校验**

```bash
npx.cmd tsc --noEmit
npm run check:catalog
```
Expected: tsc 无输出；`action catalog: ok (assessment=6, treatment=2, training=6, golden=20)`

- [ ] **Step 6: 提交**

```bash
git add src/knowledge/pilot/full-demo-content.ts src/knowledge/pilot/local-limb-regions.ts src/features/rehabmind/components/workbench/workbench-support.tsx
git commit -m "refactor(actions): source heel-raise assessment copy from action catalog"
```

---

### Task 8: 训练库接入旧消费方

**Files:**
- Modify: `src/knowledge/pilot/full-demo-content.ts:361、604、612`
- Modify: `src/knowledge/pilot/local-limb-regions.ts:105、106、108`

**Interfaces:**
- Consumes: `trainingCopy`（Task 5）
- Produces: 无新导出

- [ ] **Step 1: 加 import**

`full-demo-content.ts` 与 `local-limb-regions.ts` 的 import 段各追加：

```ts
import { trainingCopy } from "@/src/knowledge/actions/bridge";
```

- [ ] **Step 2: 替换 3 条膝/踝训练条目**

`full-demo-content.ts:361` 整行替换为：

```ts
    exercise("knee-calf-raise", "扶墙双脚提踵", 2, trainingCopy("knee-calf-raise").sets, trainingCopy("knee-calf-raise").reps, trainingCopy("knee-calf-raise").how, trainingCopy("knee-calf-raise").observe, trainingCopy("knee-calf-raise").easier, trainingCopy("knee-calf-raise").harder, ["calf", "heel-raise", "gait"], trainingCopy("knee-calf-raise").purpose),
```

`full-demo-content.ts:604` 整行替换为：

```ts
    exercise("ankle-achilles-isometric", "坐姿提踵保持", 1, trainingCopy("ankle-achilles-isometric").sets, trainingCopy("ankle-achilles-isometric").reps, trainingCopy("ankle-achilles-isometric").how, trainingCopy("ankle-achilles-isometric").observe, trainingCopy("ankle-achilles-isometric").easier, trainingCopy("ankle-achilles-isometric").harder, ["achilles", "tendon-loading", "heel-raise", "isometric"], trainingCopy("ankle-achilles-isometric").purpose),
```

`full-demo-content.ts:612` 整行替换为：

```ts
    exercise("ankle-band-heelraise", "踝四方向弹力带抗阻与提踵", 2, trainingCopy("ankle-band-heelraise").sets, trainingCopy("ankle-band-heelraise").reps, trainingCopy("ankle-band-heelraise").how, trainingCopy("ankle-band-heelraise").observe, trainingCopy("ankle-band-heelraise").easier, trainingCopy("ankle-band-heelraise").harder, ["ankle-strength", "calf", "peroneal"], trainingCopy("ankle-band-heelraise").purpose),
```

- [ ] **Step 3: 替换 3 条小腿局部训练条目**

`local-limb-regions.ts:105`：

```ts
    exercise("calf-back-seated-raise", "坐姿提踵", 1, trainingCopy("calf-back-seated-raise").sets, trainingCopy("calf-back-seated-raise").reps, trainingCopy("calf-back-seated-raise").how, trainingCopy("calf-back-seated-raise").observe, trainingCopy("calf-back-seated-raise").easier, trainingCopy("calf-back-seated-raise").harder, ["calf-back", "soleus", "heel-raise"], trainingCopy("calf-back-seated-raise").startPosition, trainingCopy("calf-back-seated-raise").purpose),
```

`local-limb-regions.ts:106`：

```ts
    exercise("calf-back-standing-raise", "双脚站姿提踵", 2, trainingCopy("calf-back-standing-raise").sets, trainingCopy("calf-back-standing-raise").reps, trainingCopy("calf-back-standing-raise").how, trainingCopy("calf-back-standing-raise").observe, trainingCopy("calf-back-standing-raise").easier, trainingCopy("calf-back-standing-raise").harder, ["calf-back", "gastrocnemius", "heel-raise"], trainingCopy("calf-back-standing-raise").startPosition, trainingCopy("calf-back-standing-raise").purpose),
```

`local-limb-regions.ts:108`：

```ts
    exercise("calf-medial-arch", "足弓保持与提踵", 2, trainingCopy("calf-medial-arch").sets, trainingCopy("calf-medial-arch").reps, trainingCopy("calf-medial-arch").how, trainingCopy("calf-medial-arch").observe, trainingCopy("calf-medial-arch").easier, trainingCopy("calf-medial-arch").harder, ["calf-medial", "arch", "heel-raise"], trainingCopy("calf-medial-arch").startPosition, trainingCopy("calf-medial-arch").purpose),```

> 两个 helper 的实参顺序不同：`full-demo` 的 `exercise(id,title,stage,sets,reps,how,observe,easier,harder,tags,purpose?)`（无 startPosition，体位靠推断）；`local-limb` 的 `exercise(id,title,stage,sets,reps,how,observe,easier,harder,tags,startPosition,purpose)`。执行时以两文件内 helper 定义为准，先读后改。

- [ ] **Step 4: 确认体位推断未被破坏**

两条规则不同（已在基线确认）：`full-demo-content.ts` 的 `exercise()` **没有** `startPosition` 参数，体位由 `${title} ${how}` 正则推断（`:235-244`：侧卧→四点跪→仰卧→坐位→默认站立）；`local-limb-regions.ts` 的 `exercise` 有**显式** `startPosition` 实参，不走推断。所以：

| id | 来源 | 迁移前 | 迁移后推断依据 | 期望 |
|---|---|---|---|---|
| knee-calf-raise | full-demo·推断 | 站立 | title「扶墙双脚提踵」+ how 不含关键词 | 站立 |
| ankle-achilles-isometric | full-demo·推断 | 坐位（title 含「坐姿」） | title 不变，how 不含「坐姿/坐位/坐在/坐好/坐站」 | 坐位 |
| ankle-band-heelraise | full-demo·推断 | 站立 | 同上 | 站立 |
| calf-back-seated-raise | local-limb·显式 | 坐位 | 显式实参直传 | 坐位 |
| calf-back-standing-raise | local-limb·显式 | 站立 | 显式实参直传 | 站立 |
| calf-medial-arch | local-limb·显式 | 站立 | 显式实参直传 | 站立 |

Run: `node --experimental-strip-types -e "import('./src/knowledge/pilot/full-demo-content.ts').then(async m=>{const {PILOT_REGIONS}=await import('./src/knowledge/pilot/full-demo-content.ts');for(const r of PILOT_REGIONS)for(const e of r.exercises??[])if(['knee-calf-raise','ankle-achilles-isometric','ankle-band-heelraise'].includes(e.id))console.log(e.id,e.startPosition)})"`

Expected: `knee-calf-raise 站立`、`ankle-achilles-isometric 坐位`、`ankle-band-heelraise 站立`。

**任何一条与表不符即本任务失败**：说明 title 或 how 被改出了正则敏感词（如把「坐姿提踵保持」改成了不含「坐姿」的写法）。修 title/how 恢复原词，不得去改正推断正则。

- [ ] **Step 5: 校验并提交**

```bash
npx.cmd tsc --noEmit
npm run check:catalog
git add src/knowledge/pilot/full-demo-content.ts src/knowledge/pilot/local-limb-regions.ts
git commit -m "refactor(actions): source heel-raise training copy from action catalog"
```

---

### Task 9: 处理库接入旧消费方

**Files:**
- Modify: `src/knowledge/pilot/full-demo-content.ts:566、587`

**Interfaces:**
- Consumes: `treatmentDo`（Task 5）
- Produces: 无新导出

- [ ] **Step 1: 替换 2 条候选的 `do`**

`full-demo-content.ts:566` 中 `candidate("ankle-medial-control", …)` 的第 5 个实参（do 文本）替换为 `treatmentDo("ankle-medial-control")`，其余实参不动：

```ts
        candidate("ankle-medial-control", "足弓与提踵控制练习", "control", "self", treatmentDo("ankle-medial-control"), "脚跟垂直抬起，不向内外偏。", "重新比较走路、提踵或单腿站。", ["arch", "heel-raise", "lower-chain"]),
```

`full-demo-content.ts:587` 同理：

```ts
        candidate("ankle-achilles-load", "双脚提踵起步", "control", "self", treatmentDo("ankle-achilles-load"), "疼痛不逐个明显上升；第二天没有持续加重。", "记录提踵高度、个数和次日反应。", ["tendon-loading", "heel-raise"]),
```

- [ ] **Step 2: 确认 `retestOf` 未被接线**

本批次**只**把 `retestOf` 作为数据存在库里，不改复测渲染路径。`build-trial-targets-core.ts:182` 的 `normalizePilotMuscleRegion` 会把 `candidate.do` 拼进区域识别串——两条都是 `type: "control"`，`:181` 已提前 return，不受影响。

Run: `npx.cmd tsc --noEmit`
Expected: 无输出

- [ ] **Step 3: 校验并提交**

```bash
npm run check:catalog
git add src/knowledge/pilot/full-demo-content.ts
git commit -m "refactor(actions): source heel-raise treatment instructions from action catalog"
```

---

### Task 10: 回归与验收

**Files:**
- Modify: `docs/handover/test-notice-2026-09-01-batch-sha-bindings.md`

- [ ] **Step 1: 全量静态检查**

```bash
npx.cmd tsc --noEmit
npm run check:catalog
npm run check:knowledge
npm run check:boundaries
npm run check:structure
```
Expected: tsc 无输出；`check:catalog` 与 `check:knowledge` 输出 `ok`；boundaries/structure 无 error。

- [ ] **Step 2: 结构快照对比**

```bash
npm run snapshot:render -- after
node -e "const fs=require('fs');const a=fs.readFileSync('D:/Study/codex/project/snapshot-before.txt','utf8');const b=fs.readFileSync('D:/Study/codex/project/snapshot-after.txt','utf8');if(a===b){console.log('STRUCTURE IDENTICAL')}else{console.log('STRUCTURE DIFF');process.exit(1)}"
```
Expected: `STRUCTURE IDENTICAL`。**不一致即回滚本批次全部提交**，不得调整快照口径来迁就改动。

- [ ] **Step 3: 可见文字实测**

Run: `node scripts/knowledge/snapshot-render.mjs text-check` 之前，先用一次性脚本抓 12 场景 innerText（写到仓库外），逐条确认：

- 剂量收敛生效：`knee-heel-raise` 显示 10 次（原 5）、`ankle-calf` 单脚上限 10（原 20）、`calf-back-standing-raise`/`calf-medial-arch`/`ankle-band-heelraise` 显示 `3组 · 每组10～15个`
- 无旧剂量残留：全 dump 内不得再出现「最多记录20个高质量次数」（收敛 #1）、「完成5次」（knee-heel-raise，收敛 #2）、「扶墙做5次双脚提踵」（两条 calf，收敛 #2）、训练卡上的「每组8～12个」（仅 `calf-back-standing-raise`/`calf-medial-arch`/`ankle-band-heelraise`，收敛 #3）。
- **允许保留的旧值**（各自有据）：`knee-calf`/`ankle-calf`/`ankle-heel-raise` 自助版「做5次」（收敛 #5 待你确认）；`calf-back-seated-raise` 的「每组8～12个」（坐姿低负荷，有意保留）；`ankle-achilles-isometric` 的「保持30秒／保持10秒／每组5次」（等长例外）。
- 专业模式不受影响：`thinking` 模式下 `knee-calf` 仍显示「双脚提踵，允许时再左右单腿提踵各做。」

- [ ] **Step 4: 通知档追加第 15 轮**

在 `docs/handover/test-notice-2026-09-01-batch-sha-bindings.md` 末尾追加一节，至少包含：

- 本批次全部 SHA（待绑定）
- 剂量收敛 4 条的前后值（引用设计文档 §12 表格）
- 明确声明：本批次**无契约变化**、**DOM 结构逐字节一致**（附 Step 2 输出）
- 提醒测试侧：提踵相关断言中的数字（5/10/20）已变，按结构断言而非字面断言

- [ ] **Step 5: 提交并推送**

```bash
git add docs/handover/test-notice-2026-09-01-batch-sha-bindings.md
git commit -m "docs(notice): round 15 — heel-raise family migrated to action catalog, doses converged"
git push origin main:agent/dev-20260901
```

---

## 完成标准

批次 0＋1 全部任务完成后：

1. `npm run check:catalog` 绿，且 `golden=20` 条成品文案被锁死。
2. 提踵族的叫法只存在于 `terms.ts`；改 `ACTION_TERMS["heel-raise-standing"].plain` 会让 6 条评估、2 条处理、6 条训练的白话同时变化。
3. 剂量全部是字段；`CAT-DOSE-IN-SENTENCE` 规则会阻止数字重新写回句子。
4. DOM 结构快照与迁移前逐字节一致。
5. 消费方组件（`assessment-stage.tsx`、`training-stage.tsx`、`workbench-support.tsx` 的渲染函数）**一行未改**——只有数据源换了。

未达成任何一条即视为批次未完成，不得进入批次 2。
