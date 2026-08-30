# DEF-SPECIAL-QUEUE：专项检查无法进入专业膝部首轮评估队列

- 日期：2026-08-30
- 状态：待开发确认
- 关联：开发侧交接第三部分 D-1/D-2/D-3；知识重构批次 8 个新特殊检查模块
- 测试侧代码：`tests/browser/scenarios/safety-blocking.spec.ts`（D-3 标记 fixme）

## 现象

专业模式（协助他人检查 + 能力勾选「专项检查」，界面确认"专项检查 已开放"），
急性外伤主诉（今天或昨天 + 跌倒或碰撞 / 扭转或崴伤）下，首轮评估队列中始终
不出现任何专项检查卡（如「急性膝外伤骨折风险判断」「前交叉韧带稳定性检查」），
工作台专项检查模块计数为 0 项。

触发逻辑本身正常：`specialIsRelevant("急性外伤后的膝部问题", intake)` 在
同等 intake 下返回 true（`tests/unit/domain/probe-special-filter.test.mjs`
验证，KEPT=[knee-acute-fracture-screen, knee-acl-stability]）。

## 初步定位（测试侧静态分析，供开发参考）

1. 队列构建：`rehabmind-workbench.tsx:1445` specialItems 过滤通过
   （access=therapist ∈ 允许集、trigger 相关）。
2. 但排序预算 `PILOT_ASSESSMENT_BUDGET.rehab = 6`，膝部分支返回
   `[主诉功能卡, 基线方向(伸直/屈曲/髌骨四方向), 显式功能, 局部力量, ...尾部]`
   （`pilot-decision-engine.ts` 膝分支）。专项检查 id 在 `taskPriority` /
   `locationPriority` / 关系与分支映射中均无加分（全知识库无
   `special:knee-*` 的引用），得分恒为 0，只能按原始序拼在尾部。
3. 实测（不带被动能力）：队列 6 席被
   下蹲功能/伸直/屈曲/大腿内侧力量/单腿支撑/髋伸与后侧链占满，专项检查全部出局。
4. 结论：膝部专项检查在当前排序预算下**结构性不可达**，D-2/D-3 的
   浏览器层证据链无法建立。

## 请求开发

- 确认膝部专项检查的预期入队口径：触发时是否应突破预算（类似髌骨四方向的
  preserved 处理），或以更高的优先分进入首轮。
- 若预期为"安全类专项（bone-screen）优先于常规力量项"，建议在
  `rankPilotAssessmentIds` 膝分支为 `special:*`（至少 bone-screen/stability 类）
  增加显式优先分或 preserved 集合。

## 影响与回归计划

- D-1 触发逻辑已有单测（`tests/unit/domain/special-test-trigger.test.mjs`，4 例通过）。
- D-2 已改走安全确认阶段的骨性风险问题链路（Ottawa 口径）完成浏览器证据并通过：
  `tests/browser/scenarios/safety-blocking.spec.ts` "D-2 骨性风险阳性"。
- D-3（稳定性检查阳性 → 转医学评估）浏览器场景已写好断言骨架并标记 fixme；
  修复入队口径后恢复完整链路断言。
