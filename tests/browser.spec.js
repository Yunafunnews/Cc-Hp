import { test, expect } from "@playwright/test";
test("gallery filters, detail downloads and language preference work", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Little loops. Big happiness." }),
  ).toBeVisible();
  await expect(page.locator(".gif-card")).not.toHaveCount(0);
  await page
    .getByPlaceholder("Search for a little happiness...")
    .fill("zzzzmissing");
  await expect(page.getByText("No loops found")).toBeVisible();
  await page.getByPlaceholder("Search for a little happiness...").fill("");
  await page.getByRole("button", { name: "Cats", exact: true }).click();
  await expect(page.locator(".gif-card").first()).toBeVisible();
  await page.getByRole("button", { name: "All loops", exact: true }).click();
  await page.locator(".gif-card .gif-open").first().click();
  await expect(
    page.getByRole("dialog").getByRole("link", { name: /Download GIF/ }),
  ).toHaveAttribute("href", /\/api\/gifs\/\d+\/download/);
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page
    .getByRole("button", { name: "Settings", exact: true })
    .first()
    .click();
  await page.getByLabel("Language").selectOption("zh-CN");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "发现", exact: true }),
  ).toBeVisible();
});
test("signup, saved collection and upload pending state persist", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Join the pack", exact: true })
    .first()
    .click();
  const name = `test${Date.now()}`;
  await page.getByLabel("Display name").fill(name);
  await page.getByLabel("Email", { exact: true }).fill(`${name}@example.com`);
  await page
    .getByLabel("Password", { exact: true })
    .fill("correct horse battery");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.getByText("20 XP", { exact: true }).first()).toBeVisible();
  await page.locator(".gif-card .save-button").first().click();
  await page
    .getByRole("button", { name: "My collection", exact: true })
    .first()
    .click();
  await expect(page.locator(".gif-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Upload a GIF", exact: true })
    .first()
    .click();
  await page.getByLabel("GIF file").setInputFiles({
    name: "pet.gif",
    mimeType: "image/gif",
    buffer: Buffer.from(
      "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
      "base64",
    ),
  });
  await page.getByLabel("Title", { exact: true }).fill("My first pet GIF");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Submit for review" }).click();
  await expect(
    page.getByText("Your loop is waiting for a little check."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page
    .getByRole("button", { name: "My uploads", exact: true })
    .first()
    .click();
  await expect(page.getByText("My first pet GIF")).toBeVisible();
  await expect(page.getByText("Pending", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "My growth", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Check in", exact: true }).click();
  await expect(page.getByText("30 XP", { exact: true }).first()).toBeVisible();
});
test("mobile navigation stays within viewport and login dialog supports escape", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page
    .getByRole("button", { name: "Upload a GIF", exact: true })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("shared links open GIFs independently of the default gallery page", async ({
  page,
  request,
}) => {
  const gallery = await (await request.get("/api/gifs")).json();
  const target = gallery.gifs[0];
  await page.route("**/api/gifs", async (route) => {
    const response = await route.fetch();
    const data = await response.json();
    await route.fulfill({
      response,
      json: { gifs: data.gifs.filter((g) => g.id !== target.id) },
    });
  });
  await page.goto(`/?gif=${target.id}`);
  await expect(page.getByRole("dialog", { name: target.title })).toBeVisible();
});
test("late dashboard responses cannot restore a signed-out account", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Join the pack", exact: true })
    .first()
    .click();
  const name = `late${Date.now()}`;
  await page.getByLabel("Display name").fill(name);
  await page.getByLabel("Email", { exact: true }).fill(`${name}@example.com`);
  await page
    .getByLabel("Password", { exact: true })
    .fill("correct horse battery");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.getByText("20 XP", { exact: true }).first()).toBeVisible();
  let release, arrived;
  const gate = new Promise((r) => (release = r));
  const ready = new Promise((r) => (arrived = r));
  await page.route("**/api/dashboard", async (route) => {
    const response = await route.fetch();
    arrived();
    await gate;
    await route.fulfill({ response });
  });
  await page
    .getByRole("button", { name: "My growth", exact: true })
    .first()
    .click();
  await ready;
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
  const response = page.waitForResponse("**/api/dashboard");
  release();
  await response;
  await page
    .getByRole("button", { name: "Settings", exact: true })
    .first()
    .click();
  await expect(page.getByText("You’re exploring as a guest.")).toBeVisible();
});
test("removing a saved GIF in its detail removes it from the collection", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Join the pack", exact: true })
    .first()
    .click();
  const name = `save${Date.now()}`;
  await page.getByLabel("Display name").fill(name);
  await page.getByLabel("Email", { exact: true }).fill(`${name}@example.com`);
  await page
    .getByLabel("Password", { exact: true })
    .fill("correct horse battery");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.getByText("20 XP", { exact: true }).first()).toBeVisible();
  await page.locator(".gif-card .save-button").first().click();
  await page
    .getByRole("button", { name: "My collection", exact: true })
    .first()
    .click();
  await expect(page.locator(".gif-card")).toHaveCount(1);
  await page.locator(".gif-card .gif-open").click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Saved", exact: true })
    .click();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await expect(page.locator(".gif-card")).toHaveCount(0);
});
