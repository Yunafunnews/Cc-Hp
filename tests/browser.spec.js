import { spawnSync } from "node:child_process";
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

test("administrator manages approvals, metadata, members and points from the console", async ({
  page,
  browser,
}) => {
  const name = `admin${Date.now()}`,
    email = `${name}@example.com`;
  const signup = await page.context().request.post("/api/auth/register", {
    data: { username: name, email, password: "correct horse battery" },
  });
  expect(signup.status()).toBe(201);
  const owner = await signup.json();
  const promoted = spawnSync(process.execPath, ["server/admin.js", email], {
    encoding: "utf8",
    env: { ...process.env, DATA_DIR: process.env.CC_HP_BROWSER_DATA_DIR },
  });
  expect(promoted.status).toBe(0);
  const friend = await browser.newContext({ baseURL: "http://127.0.0.1:3100" });
  const friendName = `friend${Date.now()}`;
  const friendEmail = `${friendName}@example.com`;
  await friend.request.post("/api/auth/register", {
    data: {
      username: friendName,
      email: friendEmail,
      password: "correct horse battery",
      invite: owner.user.inviteCode,
    },
  });
  await friend.request.post("/api/gifs", {
    multipart: {
      title: "Admin workflow pet",
      category: "cats",
      tags: "pet,review",
      file: {
        name: "pet.gif",
        mimeType: "image/gif",
        buffer: Buffer.from(
          "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
          "base64",
        ),
      },
    },
  });
  await page.goto("/#admin");
  await expect(
    page.getByRole("heading", { name: "Admin console", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "GIF management", exact: true })
    .click();
  const row = page.getByRole("row").filter({ hasText: "Admin workflow pet" });
  await row.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(row).toHaveCount(0);
  await page.getByLabel("Content status").selectOption("approved");
  const approved = page
    .getByRole("row")
    .filter({ hasText: "Admin workflow pet" });
  await approved.getByRole("button", { name: "Edit", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Title", { exact: true })
    .fill("Reviewed happy dog");
  await page.getByRole("dialog").getByLabel("Category").selectOption("dogs");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(
    page.getByText("Reviewed happy dog", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Members", exact: true }).click();
  await page.getByPlaceholder("Search members...").fill(friendEmail);
  const memberRow = page.getByRole("row").filter({ hasText: friendEmail });
  await memberRow.getByRole("button", { name: "View", exact: true }).click();
  await expect(
    page.getByRole("dialog").getByText("75 XP", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page
    .getByRole("button", { name: "Points ledger", exact: true })
    .click();
  await page.getByPlaceholder("Search ledger...").fill(friendEmail);
  await expect(
    page.getByRole("row").filter({ hasText: "First upload bonus" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await friend.close();
});
test("guest cannot enter the admin console through a direct link", async ({
  page,
}) => {
  await page.goto("/#admin");
  await expect(
    page.getByRole("heading", { name: "Admin console", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Join the pack", exact: true }),
  ).toBeVisible();
});

test("reviewing the final item on the last admin page returns to a valid page", async ({
  page,
}) => {
  const name = `pager${Date.now()}`,
    email = `${name}@example.com`;
  const response = await page.context().request.post("/api/auth/register", {
    data: { username: name, email, password: "correct horse battery" },
  });
  const { user } = await response.json();
  const { DatabaseSync } = await import("node:sqlite");
  const { writeFileSync } = await import("node:fs");
  const path = await import("node:path");
  const dir = process.env.CC_HP_BROWSER_DATA_DIR;
  const db = new DatabaseSync(path.join(dir, "pawloop.sqlite"));
  db.prepare("UPDATE users SET role='admin' WHERE id=?").run(user.id);
  writeFileSync(
    path.join(dir, "uploads", "pagination-fixture.gif"),
    Buffer.from(
      "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
      "base64",
    ),
  );
  const insert = db.prepare(
    "INSERT INTO gifs(user_id,title,category,tags,filename,width,height,size) VALUES (?,?,'cats','paginationfixture','pagination-fixture.gif',1,1,42)",
  );
  for (let i = 1; i <= 21; i++) insert.run(user.id, `Pagination fixture ${i}`);
  db.close();
  await page.goto("/#admin");
  await page
    .getByRole("button", { name: "GIF management", exact: true })
    .click();
  await page.getByPlaceholder("Search GIFs...").fill("paginationfixture");
  await expect(page.locator(".admin-pagination")).toContainText("21 records");
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(page.locator(".admin-pagination")).toContainText("Page 2 / 2");
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(page.locator(".admin-pagination")).toContainText("Page 1 / 1");
  await expect(page.locator(".admin-table tbody tr")).toHaveCount(20);
});
