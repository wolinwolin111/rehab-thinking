# RehabMind 整改测试执行报告

最终执行时间：2026-08-27（Asia/Shanghai）
执行口径：以《回归测试总表》为主任务单，并对照测试会话交接文档、真实浏览器覆盖矩阵、产品主规范和决策引擎规范。
最终修复提交：`42c0efb1c85f2a1f6d6d2e512bcdba9f04b435d1`
主整改提交：`f4c7b393500ac85c830ea15ff609f7027ba70688`；多动作队列补充提交：`9233d0fa86cc291f9e84aba33cadec0862ee1b5c`
最终 buildId：`local-42c0efb1c85f`
snapshot schema：`2`

## 一、最终结论

本次指定未收口项 `UX-01`、`INSPECT-ENTRY-GATE-01`、`BODY-MAP-UI-02`、多标签页冲突和已确认视觉基线均已完成开发整改，并在同一最终 buildId 上重新验证通过。没有修改测试断言来制造通过；视觉基线只更新了已确认设计发生变化的多功能动作队列截图。

完整 Edge 浏览器套件共 41 项：32 passed、9 个既有显式 skipped、0 failed。`skipped` 是测试文件中已经声明的环境/夹具范围，不计作通过，也不计作失败。

## 二、定向回归

| 缺陷/范围 | 命令 | 结果 | 证据 |
| --- | --- | --- | --- |
| UX-01 | `node scripts/quality/run-browser-tests.mjs ux-01-final-42c0efb1c85f tests/browser/known-defects/ux-regression.spec.ts --project=edge-target` | 3/3 passed | `artifacts/quality/playwright/ux-01-final-42c0efb1c85f` |
| BODY-MAP-UI-02 | `node scripts/quality/run-browser-tests.mjs body-map-final-42c0efb1c85f tests/browser/contracts/score-body-map.spec.ts --project=edge-full` | 3/3 passed（含 BODY-MAP-UI-01、SCORE-UI-01） | `artifacts/quality/playwright/body-map-final-42c0efb1c85f` |
| INSPECT-ENTRY-GATE-01 | `node scripts/quality/inspect-local.mjs http://localhost:3000 --visual --axe` | 全部通过 | `artifacts/quality/inspect-local/2026-08-26T21-41-36-389Z/report.md` |
| 多标签页冲突 | `node scripts/quality/run-browser-tests.mjs multitab-final-42c0efb1c85f tests/browser/overall/retest-training-followup.spec.ts --project=edge-full` | 2 passed、1 个既有显式 skipped | `artifacts/quality/playwright/multitab-final-42c0efb1c85f` |
| 已确认视觉基线 | `node scripts/quality/run-browser-tests.mjs visual-final-42c0efb1c85f tests/browser/visual/critical-layout.spec.ts --project=edge-full` | 3/3 passed | `artifacts/quality/playwright/visual-final-42c0efb1c85f` |

## 三、完整测试与质量门禁

| 测试层 | 命令 | 结果 |
| --- | --- | --- |
| 完整真实浏览器 | `node scripts/quality/run-browser-tests.mjs full-final-42c0efb1c85f --project=edge-full` | 41 项：32 passed、9 skipped、0 failed |
| 快速门禁 | `npm run test:fast` | 通过：architecture boundaries、typecheck、build、137 个 Node 测试文件全部通过 |
| 构建 | `npm run build` | 通过；输出 `rehabmind-pilot-app-0.1.0+local-42c0efb1c85f.42c0efb1c85f` |
| lint | `npm run lint` | 0 error、2 个 Hook warning |
| 巡检 | `inspect-local --visual --axe` | 320/360/390/412/430/1440px 全部通过；HTTP/API、运行时、布局、遮挡、axe、视觉均通过 |

完整浏览器证据：`artifacts/quality/playwright/full-final-42c0efb1c85f`。

## 四、已修复的实现要点

- 入口闸门在匿名建案成功后按状态关闭，刷新后不残留遮罩，入口巡检可以继续。
- 教程的完成/跳过状态与重新打开动作分离，首页入口能够重新打开聚焦教程；关键 CTA 通过最小尺寸约束。
- 身体图把“主要大部位”和具体左右标记分开保存，切换区域不会静默丢掉旧标记，清理行为必须由用户主动确认。
- 本机草稿使用 tab 身份、版本信号和草稿指纹做跨标签页检测；发现交错修改时显示冲突操作，让用户重新加载或保留当前内容。
- 多个功能动作按独立身份进入评估队列，排序不会丢掉第二个及后续功能动作；处理/复测仍按动作身份隔离。
- 固定 `eventId` 的完全重放复用原事件时间和成功结果，不新增 revision 或重复事件。

## 五、明确保留的非阻塞范围

本次不把 9 个既有 skipped 场景写成通过。它们主要是急性踝完整闭环、双侧完整页面闭环、处理/训练加重整体路径、第二次康复历史、管理员查询/清理和 T-09 浏览器时间夹具等，仍按覆盖矩阵标注为 skipped/blocked。Pixel 5/iPhone 13 仍属于移动预览冒烟，不等同于 Android 真机 APK 全量验证。

## 六、历史失败记录

此前 `fdaee6fc5ca3` dirty 工作树上的 `DATA-REPLAY-01`、`BUILD-TYPE-01`、UX-01、入口闸门和旧视觉基线失败属于历史执行结果，不能与本最终 build 混用；对应实现已在本次修复提交中收口，并由上面的最终命令重新验证。
