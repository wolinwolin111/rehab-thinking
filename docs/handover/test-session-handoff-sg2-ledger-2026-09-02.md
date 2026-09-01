# 测试交接档 · SG-2 双侧逐侧复测台账落定（2026-09-02）

> 开发基线：`08f3e5a`（agent/dev-20260901 tip：f605270 渲染修复 + 975cbc9 能力位最小化 + 08f3e5a 口径定稿）。
> 测试侧 merge `4a07242`。

## 1. 语义口径（owner 已授权）

SG-2 台账按**专业模式**（「康复思路·给别人」，能力位仅 passiveRange+palpation）收口：
- 自助模式下膝伸直前侧走 released P0（lineage 要 `passive:"limited"`，自助 profile 剥离 passive → `kneeP0LineageFromAssessmentRecord` 丢空候选）**结构性拿不到处理单元** → 逐侧复测台账不可达——产品设计事实，非缺陷；
- 自助逐侧复测覆盖降级为独立条目（将来换非 P0 靶点如膝内侧 `knee-medial-*` 另开夹具），本批不做，不阻塞 SG-2；
- 夹具共享触诊标签英文 id → 中文（生产写中文「大腿前侧」，膝决策 `anteriorThighEvidence` 按中文匹配）——这是能生成处理单元的关键。

## 2. SG-2 断言（`tests/browser/scenarios/bilateral-per-side-retest.spec.ts`）

`bilateral-per-side-retest`（page_boundary / step 3 / fixtureKind `bilateral-per-side-retest`）落点即处理段逐侧复测台账，断言（probe 实探后落笔）：
- `bilateral-retest-ledger` 渲染 1 个，`data-priority-side="右侧"`；
- 台账头「双侧分别复测」+ h2「分别记录左右两侧处理后的变化」；
- `bilateral-retest-left/right` 各初始 `data-status="pending"`，各含 better/same/worse 三按钮；
- 主按钮 `bilateral-retest-confirm`：两侧未记完 disabled、记全后 enabled，且各自状态写入正确（left-better→left data-status="better"、right-same→right data-status="same"）；
- 点确认 → 台账收敛，进入完成面板（h2 主诉动作已复查等结论句）；
- 无完成面板/checkpoint 抢先；零 runtime errors；无横向溢出。

## 3. 回归（run=reg-20260902-sg2，workers=1）

- check:knowledge ok；test:fast 0
- edge-full：**69 passed + 0 skipped**（68+SG-2）
- overall 10/10；mobile-preview 2/2
- registry **92 条**（+SG-2；顺带修正 KR-C1 notes 尾逗号 JSON bug）

## 4. 待 dev

- 自助逐侧复测覆盖（非阻塞）：将来如需自助路径，换非 P0 靶点另开夹具（独立条目），本批无。
