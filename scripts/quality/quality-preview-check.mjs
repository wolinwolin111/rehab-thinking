const previewUrl = process.env.PILOT_PREVIEW_URL?.trim() || process.env.WALKTHROUGH_URL?.trim() || "";
const inviteConfigured = Boolean(process.env.PILOT_INVITE_TOKEN?.trim());

if (!previewUrl || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/i.test(previewUrl)) {
  console.error("预览验收被阻断：PILOT_PREVIEW_URL 必须指向非本机预览环境。");
  process.exit(2);
}
if (!inviteConfigured) {
  console.error("预览验收被阻断：未配置 PILOT_INVITE_TOKEN，不能验证邀请边界。");
  process.exit(2);
}

console.log(`预览验收前置配置完整：${new URL(previewUrl).origin}`);
