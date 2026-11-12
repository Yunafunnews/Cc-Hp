import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
export default defineConfig({
  testDir: "tests",
  testMatch: "pages.browser.spec.js",
  fullyParallel: false,
  use: {
    baseURL: "http://127.0.0.1:3300/Cc-Hp/",
    headless: true,
    launchOptions: {
      executablePath:
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
        (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
      args: ["--no-sandbox"],
    },
  },
  webServer: {
    command: "node tests/pages-server.js",
    url: "http://127.0.0.1:3300/Cc-Hp/",
    reuseExistingServer: false,
  },
});
