// RehabMind 生产进程配置（pm2）。从同目录 .env 读取明文键值注入环境。
// 服务器路径约定：~/rehabmind/current -> releases/<timestamp>（由 scripts/deploy/vps-release.sh 维护）。
/* eslint-disable @typescript-eslint/no-require-imports -- PM2 loads this deployment file as CommonJS. */
const fs = require("node:fs");
const path = require("node:path");
const env = {};
for (const line of fs.readFileSync(path.join(__dirname, ".env"), "utf8").split("\n")) {
  const m = line.match(/^([A-Za-z0-9_]+)=(.*)\s*$/);
  if (m) env[m[1]] = m[2];
}
if (env.PILOT_DB_DRIVER !== "sqlite") {
  // 当前唯一运行路径为 VPS + Node + SQLite。
  throw new Error("PILOT_DB_DRIVER must be sqlite in this environment");
}
module.exports = {
  apps: [
    {
      name: "rehabmind",
      script: "npm",
      args: "run start",
      cwd: __dirname,
      env,
      max_memory_restart: "400M",
      time: true,
    },
  ],
};
