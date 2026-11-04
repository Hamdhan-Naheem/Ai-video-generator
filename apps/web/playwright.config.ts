import { defineConfig, devices } from "@playwright/test";

const port = process.env.PLAYWRIGHT_PORT ?? "3100";
if (!["3000", "3100"].includes(port)) throw new Error("Unexpected local test port");
const origin = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  workers: 1,
  reporter: "list",
  use: { baseURL: origin, trace: "retain-on-failure", channel: "chrome" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1000 } } },
    { name: "mobile", use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: `"${process.execPath}" ../../node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port ${port}`,
    url: `${origin}/preview/dashboard`,
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === "1",
    timeout: 240_000,
    env: { NEXT_TELEMETRY_DISABLED: "1", APP_ORIGIN: origin },
  },
});
