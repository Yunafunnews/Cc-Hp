import { test, expect } from "@playwright/test";
test("Pages subpath resolves brand, media, fonts, downloads and never calls a missing API", async ({
  page,
}) => {
  const failures = [];
  page.on("pageerror", (e) => failures.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400) failures.push(`${r.status()} ${r.url()}`);
  });
  const apiCalls = [];
  page.on("request", (r) => {
    if (new URL(r.url()).pathname.startsWith("/api/")) apiCalls.push(r.url());
  });
  await page.goto("./");
  await expect(page.getByRole("button", { name: "cc&hp home" })).toBeVisible();
  await expect(page.locator(".gif-card")).toHaveCount(11);
  await expect(page).toHaveTitle(/cc&hp/);
  expect(
    await page
      .locator("img")
      .evaluateAll((imgs) => imgs.filter((i) => !i.naturalWidth).length),
  ).toBe(0);
  await page.locator(".gif-card .gif-open").first().click();
  const link = page
    .getByRole("dialog")
    .getByRole("link", { name: /Download GIF/ });
  await expect(link).toHaveAttribute("href", /\/Cc-Hp\/gifs\/demo-cat-/);
  const downloadPromise = page.waitForEvent("download");
  await link.click();
  expect((await downloadPromise).suggestedFilename()).toMatch(/\.gif$/);
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page
    .getByRole("button", { name: "Upload a GIF", exact: true })
    .first()
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByText(
        "You are viewing the public gallery. Accounts and uploads will be available when the community opens.",
      ),
  ).toBeVisible();
  await expect(page.getByRole("dialog").locator("form")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page
    .getByPlaceholder("Search for a little happiness...")
    .fill("zzzzmissing");
  await expect(page.getByText("No loops found")).toBeVisible();
  expect(apiCalls).toEqual([]);
  expect(failures).toEqual([]);
});
test("language settings contain thirty-plus choices and priority translations persist", async ({
  page,
}) => {
  await page.goto("./#settings");
  const selector = page.locator("#language");
  expect(await selector.locator("option").count()).toBeGreaterThanOrEqual(30);
  for (const [locale, label] of [
    ["ja", "設定"],
    ["de", "Einstellungen"],
    ["fr", "Paramètres"],
    ["es", "Configuración"],
  ]) {
    await selector.selectOption(locale);
    await expect(page.locator(".page-heading h1")).toHaveText(label);
    await page.reload();
    await expect(page.locator("#language")).toHaveValue(locale);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
  }
  await selector.selectOption("ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.locator("#language").selectOption("en");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
});
test("shared GIF links stay within the project path", async ({ page }) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("./?gif=2");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Copy link", exact: true }).click();
  const url = await page.evaluate(() => navigator.clipboard.readText());
  expect(url).toBe("http://127.0.0.1:3300/Cc-Hp/?gif=2");
});
