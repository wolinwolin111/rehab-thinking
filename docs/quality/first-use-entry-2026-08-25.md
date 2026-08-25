# 首次进入与案例创建验收记录（2026-08-25）

## 验收范围

- 产品价值页只说明用户能获得什么，不展示内部流程细节；
- 进入顺序固定为“产品价值 → 渠道来源 → 数据使用说明 → 创建匿名案例 → 描述问题”；
- 用户明确同意后立即请求服务端创建案例，创建失败时不关闭数据说明；
- 问题输入使用固定结构提示，不承诺任意表达都能稳定解析；
- 已有本机记录时提供“继续以前的康复”。

## 当前实现

- 产品价值页：`rehabmind-onboarding.tsx`；
- 渠道来源底部面板：`pilot-source-gate.tsx`；
- 数据使用与同意底部面板：`pilot-consent-gate.tsx`；
- 匿名案例创建与页面串联：`rehabmind-workbench.tsx`；
- 问题输入：`symptom-stage.tsx`。

## 自动化证据

- `tests/component/first-use-entry-contract.test.mjs` 锁定患者可见文案、禁止文案和页面接线顺序；
- `tests/unit/infrastructure/pilot-first-use-core.test.mjs` 验证首次进入状态机；
- `tests/unit/infrastructure/pilot-source-consent.test.mjs` 验证来源和同意记录解析；
- `tests/workflow/p0-permission-decision-table.test.mjs` 验证来源、同意、案例状态与访问凭证的组合门禁；
- `npm run test:component`：53/53 通过。

## 证据边界

文案合同只证明当前代码使用了批准文本，不证明业务接口正确。案例创建、同意和权限由正式服务函数及 HTTP/工作流测试承担。当前 Codex 浏览器因本地 URL 策略拒绝再次访问，未把这次浏览器截图列为新增证据；此前测试工作台已完成 390px 无横向溢出检查，首次价值页仍需在最终网页人工验收中复核一次。
