import { defineConfig } from "@playwright/test";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
const dataDir = (process.env.CC_HP_BROWSER_DATA_DIR ||= mkdtempSync(
  `${tmpdir()}/pawloop-browser-`,
));
export default defineConfig({
  testDir: "tests",
  testMatch: "browser.spec.js",
  fullyParallel: false,
  use: {
    baseURL: "http://127.0.0.1:3100",
    headless: true,
    launchOptions: {
      executablePath:
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
        (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
      args: ["--no-sandbox"],
    },
  },
  webServer: {
    command: "node server/index.js",
    env: { PORT: "3100", DATA_DIR: dataDir },
    url: "http://127.0.0.1:3100/api/health",
    reuseExistingServer: false,
    timeout: 30000,
  },
});
