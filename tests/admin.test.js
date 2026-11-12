import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { createApp } from "../server/app.js";
let base, server, db, dir, owner, member, gifId;
async function req(path, { method = "GET", body, cookie } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: {
      ...(cookie ? { cookie } : {}),
      ...(body && !(body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
    },
    body:
      body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  return {
    status: response.status,
    data: await response.json(),
    cookie: response.headers.get("set-cookie")?.split(";")[0],
  };
}
before(async () => {
  dir = mkdtempSync(`${tmpdir()}/cchp-admin-`);
  const made = createApp({ dataDir: dir, seed: false });
  db = made.db;
  server = made.app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${server.address().port}`;
  owner = await req("/api/auth/register", {
    method: "POST",
    body: {
      username: "Owner",
      email: "owner@example.com",
      password: "strong sample password",
    },
  });
  db.prepare("UPDATE users SET role='admin' WHERE username='Owner'").run();
  member = await req("/api/auth/register", {
    method: "POST",
    body: {
      username: "Member",
      email: "member@example.com",
      password: "strong sample password",
      invite: owner.data.user.inviteCode,
    },
  });
  const form = new FormData();
  form.set("title", "A happy pet");
  form.set("category", "cats");
  form.set("tags", "happy,cat");
  form.set(
    "file",
    new Blob(
      [
        Buffer.from(
          "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
          "base64",
        ),
      ],
      { type: "image/gif" },
    ),
    "pet.gif",
  );
  const uploaded = await req("/api/gifs", {
    method: "POST",
    body: form,
    cookie: member.cookie,
  });
  assert.equal(uploaded.status, 201);
  gifId = uploaded.data.gif.id;
});
after(async () => {
  await new Promise((r) => server.close(r));
  db.close();
  rmSync(dir, { recursive: true, force: true });
});
test("all admin read routes reject guests and normal members", async () => {
  for (const path of [
    "/api/admin/overview",
    "/api/admin/gifs",
    "/api/admin/users",
    "/api/admin/points",
    `/api/admin/users/${member.data.user.id}`,
  ]) {
    assert.equal((await req(path)).status, 401, path);
    assert.equal(
      (await req(path, { cookie: member.cookie })).status,
      403,
      path,
    );
  }
});
test("overview counts real members, pending content and points", async () => {
  const r = await req("/api/admin/overview", { cookie: owner.cookie });
  assert.equal(r.status, 200);
  assert.equal(r.data.stats.members, 2);
  assert.equal(r.data.stats.pending, 1);
  assert.equal(r.data.stats.totalPoints, 40);
  assert.equal(r.data.recentGifs[0].id, gifId);
});
test("GIF list preserves review default and supports bounded status search", async () => {
  const r = await req("/api/admin/gifs", { cookie: owner.cookie });
  assert.equal(r.data.total, 1);
  assert.equal(r.data.gifs[0].id, gifId);
  assert.equal(
    (await req("/api/admin/gifs?status=all&q=%25", { cookie: owner.cookie }))
      .data.total,
    0,
  );
  assert.equal(
    (await req("/api/admin/gifs?page=0", { cookie: owner.cookie })).status,
    400,
  );
  assert.equal(
    (await req("/api/admin/gifs?limit=1000", { cookie: owner.cookie })).status,
    400,
  );
  assert.equal(
    (await req("/api/admin/gifs?status=garbage", { cookie: owner.cookie }))
      .status,
    400,
  );
});
test("metadata edits are admin-only, validated, visible publicly and never award points", async () => {
  const patch = { title: "A cheerful dog", category: "dogs", tags: "dog,joy" };
  assert.equal(
    (
      await req(`/api/admin/gifs/${gifId}`, {
        method: "PATCH",
        body: patch,
        cookie: member.cookie,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await req(`/api/admin/gifs/${gifId}`, {
        method: "PATCH",
        body: { ...patch, title: " " },
        cookie: owner.cookie,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await req(`/api/admin/gifs/${gifId}`, {
        method: "PATCH",
        body: patch,
        cookie: owner.cookie,
      })
    ).status,
    200,
  );
  assert.equal(
    (await req("/api/admin/overview", { cookie: owner.cookie })).data.stats
      .totalPoints,
    40,
  );
  await req(`/api/admin/gifs/${gifId}/review`, {
    method: "POST",
    body: { status: "approved" },
    cookie: owner.cookie,
  });
  const published = await req("/api/gifs?q=cheerful");
  assert.equal(published.data.gifs[0].category, "dogs");
  assert.equal(published.data.gifs[0].title, "A cheerful dog");
  assert.equal(
    (await req("/api/admin/overview", { cookie: owner.cookie })).data.stats
      .totalPoints,
    145,
  );
  await req(`/api/admin/gifs/${gifId}`, {
    method: "PATCH",
    body: { ...patch, title: "A lovely dog" },
    cookie: owner.cookie,
  });
  assert.equal(
    (await req("/api/admin/overview", { cookie: owner.cookie })).data.stats
      .totalPoints,
    145,
  );
});
test("member search/detail return useful data without password or session material", async () => {
  const r = await req("/api/admin/users?q=member%40example.com", {
    cookie: owner.cookie,
  });
  assert.equal(r.data.total, 1);
  assert.equal(r.data.users[0].points, 75);
  const detail = await req(`/api/admin/users/${member.data.user.id}`, {
    cookie: owner.cookie,
  });
  assert.equal(detail.data.user.email, "member@example.com");
  assert.equal(detail.data.stats.approvedUploads, 1);
  assert.equal(detail.data.ledger.length, 3);
  const serialized = JSON.stringify(detail.data);
  assert.ok(!serialized.includes("password"));
  assert.ok(!serialized.includes("session"));
  assert.ok(!serialized.includes("token"));
  assert.equal(
    (await req("/api/admin/users/999999", { cookie: owner.cookie })).status,
    404,
  );
  assert.equal(
    (await req("/api/admin/users?q=%25", { cookie: owner.cookie })).data.total,
    0,
  );
});
test("points ledger is searchable and paginated without changing totals", async () => {
  const r = await req("/api/admin/points?q=member%40example.com&limit=2", {
    cookie: owner.cookie,
  });
  assert.equal(r.data.total, 3);
  assert.equal(r.data.entries.length, 2);
  assert.equal(r.data.entries[0].amount, 30);
  const second = await req(
    "/api/admin/points?q=member%40example.com&limit=2&page=2",
    { cookie: owner.cookie },
  );
  assert.equal(second.data.entries.length, 1);
  assert.equal(second.data.entries[0].reason, "welcome");
  assert.equal(
    (await req("/api/admin/points?limit=nope", { cookie: owner.cookie }))
      .status,
    400,
  );
});
