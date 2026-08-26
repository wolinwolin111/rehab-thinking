import { test } from "@playwright/test";

test("反馈绑定当前模块、目标记录和提交位置", async () => {
  test.fixme(true, "反馈闭环需要服务器案例与管理员测试凭据，暂未接入可复现夹具");
});

test("管理员脱敏、错误凭据拒绝和匿名案例查询", async () => {
  test.fixme(true, "管理员端安全证据需要隔离的测试服务凭据，不能用浏览器内简化模型替代");
});

test("测试数据按本轮 runId 清理且不误删其他案例", async () => {
  test.fixme(true, "测试数据清理需要真实测试 API 和独立 runId 夹具，暂未接入");
});

