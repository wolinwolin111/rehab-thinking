# RehabMind 任务摘要（当前锚点）

> 本文件是后续执行的**唯一主要依据**。历史讨论中的已废弃方案、已完成的中间步骤、低价值重复输出均不再作为参考。改动前先读本文件。

## 一、项目

- 康复思路助手 RehabMind，代码在 `D:\Study\codex\project\rehab-thinking-demo`。
- 已上传 GitHub `wolinwolin111/rehab-thinking`，main 当前指向 commit `4a3d271`。

## 二、当前目标

修复康复流程的复测与展示问题。**上一批 6 项改动已全部完成并推送**，当前处于「等用户实测反馈 → 按反馈修剩余问题」阶段。

## 三、核心约束（不可违反）

1. **推送**：沙箱拦截 `git push`，必须用 `push-incremental.ps1`（curl 直传 blobs→tree→commit→PATCH ref）。每次改 `parentSha`/`baseTree` 为远程当前值。api.github.com 会偶发 503，**重试即可**。查询远程用 `curl.exe`（`Invoke-RestMethod` 偶发连接关闭）。
2. **GitHub**：仓库 `wolinwolin111/rehab-thinking`；token 见本地 `push-incremental.ps1`（不入库，建议撤销轮换）。
3. **验证基线**（每次改动后必须全绿）：`npm run typecheck` 0 错、`npx eslint` 0、`node --test --experimental-test-isolation=none "tests/*.test.mjs"` 全过（当前 336 项）、两条走读 0 运行时错误。
4. **走读**：`scripts/real-browser-walkthrough.mjs`（自助膝前痛）、`real-browser-walkthrough-patella.mjs`（髌骨专业）；playwright-core 驱动本机 Edge（`channel:"msedge"`，headless）。跑前确认 dev server（`npm run dev`，端口 3000）就绪。
5. **纯核心测试**：`ts.transpileModule` + `data:text/javascript;base64` 导入；多文件用 `loadBundle`（去 export/import、拓扑序，注意同名函数冲突——曾把 `candidate-safety-core` 的私有 `includesAny` 改名为 `safetyIncludesAny` 解决）。
6. 本地 git commit SHA 与远程（API 生成）不同是正常的。

## 四、已确认决策（临床/UI，本轮最终版）

1. **复测分工**：
   - 处理阶段（治疗后即时）：只复测**疼痛**（0-10 分）；方向动作加范围；功能动作评估时「做不完」的额外问「能否完成」。
   - 训练阶段（训练后统一复测）：**完整复测**——功能动作逐个「能否完成 + 稳不稳 + 疼痛」，方向动作疼痛分再确认一次。
2. **活动度疼痛 ≠ 保持疼痛**：范围性 vs 负荷性，分开记录/复测。文案锚定「转到最大范围时」vs「持续保持 3～5 秒时」。
3. **稳定性只在训练后复测**（处理阶段不稳定性）。
4. **「能否完成」提示**：有代偿也算完成。
5. **「仍不能」追问原因**：疼/害怕加重 → 结构性风险提示（转介）；没力 → 力量不足（训练可改善）。
6. **配色**：主诉 badge 琥珀橙 `#b45309`；放松标题深蓝 `#1d4e89`；总结卡片中性灰蓝 `#64748b`（避免全绿）。

## 五、当前进度（已完成的代码结构）

- 决策逻辑已解耦为纯核心：`build-trial-targets-core`、`candidate-{treatment,safety,order,action,scoring}-core`、`chief-action-core`、`action-identity-core`、`assessment-answer-core`、`patella-mobility-core`、`trial-target-core`、`trial-target-types`、`muscle-tension-assessment-core`、`home-relaxation-core`、`treatment-session-core`、`retest-routing-core` 等。
- 上一批 6 项（文案优化、颜色字号、总结卡片回归、多主诉方案 B、处理阶段 unable 特例、训练后统一复测）已完成并推送。
- 关键函数：`chiefFunctionActionLabels`（识别功能主诉动作）、`chiefMotionDirectionIds`（多方向）、`chiefMotionDirectionId`（单方向）。

## 六、未解决问题

1. **崴脚场景浏览器走读脚本未修通**：卡在肿胀位置选择器——AI 解析主诉位置不稳定，且「不舒服的位置」和「肿胀位置」两个选择器顺序不固定。导致崴脚多主诉场景无法自动化验证。
2. **待用户实测确认**：崴脚场景主诉 badge 显示、训练后整体复测页、活动度 vs 保持新文案。

## 七、下一步计划

1. 等用户实测定上一批 6 项改动，反馈剩余问题。
2. 修通崴脚走读脚本（处理肿胀位置选择器），补上自动化回归。
3. 按用户反馈继续修复，每批改动跑全量测试 + 双走读 + 推送回档点。
