import { defineConfig, devices } from "@playwright/test";

const configuredUrl = process.env.WALKTHROUGH_URL?.trim() || "http://localhost:3000/";
const baseURL = new URL(configuredUrl).origin;
const isRemoteTarget = !/^https?:\/\/localhost(?::\d+)?\/?$/i.test(configuredUrl);
const browserChannel = process.env.BROWSER_CHANNEL?.trim() || "msedge";
const artifactsDir = process.env.QUALITY_ARTIFACTS_DIR?.trim() || "artifacts/quality/playwright";

export default defineConfig({
  testDir: "./tests/browser",
  testMatch: /.*\.spec\.ts/,
  timeout: 45_000,
  expect: { timeout: 6_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 1,
  outputDir: `${artifactsDir}/test-results`,
  reporter: [
    ["list"],
    ["json", { outputFile: `${artifactsDir}/results.json` }],
    ["html", { outputFolder: `${artifactsDir}/report`, open: "never" }],
  ],
  use: {
    baseURL,
    channel: browserChannel,
    headless: true,
    locale: "zh-CN",
    viewport: { width: 1440, height: 1000 },
    actionTimeout: 8_000,
    navigationTimeout: 30_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "edge-target",
      use: { ...devices["Desktop Chrome"], channel: browserChannel },
      grep: /@target/,
    },
    {
      name: "edge-full",
      use: { ...devices["Desktop Chrome"], channel: browserChannel },
    },
  ],
  ...(isRemoteTarget
    ? {}
    : {
        webServer: {
          command: "npm run dev -- --port 3000",
          url: baseURL,
          reuseExistingServer: true,
          timeout: 120_000,
        },
      }),
});
