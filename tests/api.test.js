import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { createApp } from "../server/app.js";

let db, server, base, dir;
before(async () => {
  dir = mkdtempSync(`${tmpdir()}/pawloop-test-`);
  const made = createApp({ dataDir: dir, seed: false });
  db = made.db;
  server = made.app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  await new Promise((r) => server?.close(r));
  db?.close();
  if (dir) rmSync(dir, { recursive: true, force: true });
});
async function request(path, { body, cookie, method = "GET" } = {}) {
  const res = await fetch(base + path, {
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
    status: res.status,
    data: await res.json(),
    cookie: res.headers.get("set-cookie")?.split(";")[0],
  };
}
async function signup(name, invite = "") {
  return request("/api/auth/register", {
    method: "POST",
    body: {
      username: name,
      email: `${name}@example.com`,
      password: "correct horse battery",
      invite,
    },
  });
}
function uploadForm(
  bytes = Buffer.from(
    "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
    "base64",
  ),
) {
  const f = new FormData();
  f.set("title", "My happy pet");
  f.set("category", "cats");
  f.set("tags", "happy,cat");
  f.set("file", new Blob([bytes], { type: "image/gif" }), "pet.gif");
  return f;
}

test("registration persists session, hides password, normalizes duplicate emails and rejects bad login", async () => {
  const a = await signup("alice");
  assert.equal(a.status, 201);
  assert.equal(a.data.user.points, 20);
  assert.ok(a.cookie);
  const me = await request("/api/me", { cookie: a.cookie });
  assert.equal(me.data.user.username, "alice");
  assert.equal(me.data.user.password, undefined);
  const duplicate = await request("/api/auth/register", {
    method: "POST",
    body: {
      username: "another",
      email: "ALICE@example.com",
      password: "correct horse battery",
    },
  });
  assert.equal(duplicate.status, 409);
  assert.equal(
    (
      await request("/api/auth/login", {
        method: "POST",
        body: { email: "alice@example.com", password: "wrong" },
      })
    ).status,
    401,
  );
  const login = await request("/api/auth/login", {
    method: "POST",
    body: { email: "alice@example.com", password: "correct horse battery" },
  });
  assert.equal(login.status, 200);
  await request("/api/auth/logout", { method: "POST", cookie: login.cookie });
  assert.equal(
    (await request("/api/me", { cookie: login.cookie })).data.user,
    null,
  );
});
test("daily task credits once even across repeated requests", async () => {
  const a = await signup("daily");
  assert.equal(
    (await request("/api/tasks/checkin", { method: "POST", cookie: a.cookie }))
      .data.user.points,
    30,
  );
  assert.equal(
    (await request("/api/tasks/checkin", { method: "POST", cookie: a.cookie }))
      .status,
    409,
  );
  assert.equal(
    (await request("/api/me", { cookie: a.cookie })).data.user.points,
    30,
  );
});
test("uploads require authentication, reject disguised files and remain private pending moderation", async () => {
  assert.equal(
    (await request("/api/gifs", { method: "POST", body: uploadForm() })).status,
    401,
  );
  const a = await signup("uploader");
  assert.equal(
    (
      await request("/api/gifs", {
        method: "POST",
        cookie: a.cookie,
        body: uploadForm(Buffer.from("not a gif")),
      })
    ).status,
    400,
  );
  const sent = await request("/api/gifs", {
    method: "POST",
    cookie: a.cookie,
    body: uploadForm(),
  });
  assert.equal(sent.status, 201);
  assert.equal(sent.data.gif.status, "pending");
  assert.equal((await request("/api/gifs")).data.gifs.length, 0);
  assert.equal((await request(`/api/gifs/${sent.data.gif.id}`)).status, 404);
  const media = await fetch(base + sent.data.gif.url);
  assert.equal(media.status, 404);
  const owner = await fetch(base + sent.data.gif.url, {
    headers: { cookie: a.cookie },
  });
  assert.equal(owner.status, 200);
  assert.equal(
    (await request("/api/me", { cookie: a.cookie })).data.user.points,
    20,
  );
});
test("moderation grants upload and invite points once; favorites and comments persist", async () => {
  const inviter = await signup("inviter");
  const invited = await signup("invited", inviter.data.user.inviteCode);
  const posted = await request("/api/gifs", {
    method: "POST",
    cookie: invited.cookie,
    body: uploadForm(),
  });
  const id = posted.data.gif.id;
  assert.equal(
    (
      await request(`/api/admin/gifs/${id}/review`, {
        method: "POST",
        cookie: invited.cookie,
        body: { status: "approved" },
      })
    ).status,
    403,
  );
  db.prepare("UPDATE users SET role='admin' WHERE username='inviter'").run();
  assert.equal(
    (
      await request(`/api/admin/gifs/${id}/review`, {
        method: "POST",
        cookie: inviter.cookie,
        body: { status: "approved" },
      })
    ).status,
    200,
  );
  await request(`/api/admin/gifs/${id}/review`, {
    method: "POST",
    cookie: inviter.cookie,
    body: { status: "approved" },
  });
  assert.equal(
    (await request("/api/me", { cookie: inviter.cookie })).data.user.points,
    70,
  );
  assert.equal(
    (await request("/api/me", { cookie: invited.cookie })).data.user.points,
    75,
  );
  assert.equal((await request("/api/gifs")).data.gifs.length, 1);
  await request(`/api/gifs/${id}/save`, {
    method: "POST",
    cookie: invited.cookie,
  });
  assert.equal(
    (await request("/api/gifs?saved=1", { cookie: invited.cookie })).data.gifs
      .length,
    1,
  );
  await request(`/api/gifs/${id}/like`, {
    method: "POST",
    cookie: invited.cookie,
  });
  assert.equal(
    (await request(`/api/gifs/${id}`, { cookie: invited.cookie })).data.gif
      .likes,
    1,
  );
  await request(`/api/gifs/${id}/comments`, {
    method: "POST",
    cookie: invited.cookie,
    body: { text: "So cute!" },
  });
  assert.equal(
    (await request(`/api/gifs/${id}`)).data.comments[0].text,
    "So cute!",
  );
  assert.equal(
    (await fetch(`${base}/api/gifs/${id}/download`)).headers.get(
      "content-type",
    ),
    "image/gif",
  );
});
test("cross-origin mutations and invalid invitation are rejected", async () => {
  const res = await fetch(base + "/api/auth/register", {
    method: "POST",
    headers: {
      Origin: "https://evil.example",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
  assert.equal(res.status, 403);
  assert.equal((await signup("badinvite", "DOESNOTEXIST")).status, 400);
  assert.equal((await request("/api/gifs?saved=1")).status, 401);
});
test("malformed request bodies return validation errors instead of internal failures", async () => {
  const res = await fetch(base + "/api/auth/register", { method: "POST" });
  assert.equal(res.status, 400);
  const login = await fetch(base + "/api/auth/login", { method: "POST" });
  assert.equal(login.status, 400);
});
test("reporting queues review without allowing one member to unpublish a public loop", async () => {
  const a = await signup("reporter");
  const list = await request("/api/gifs");
  const id = list.data.gifs[0].id;
  assert.equal(
    (
      await request(`/api/gifs/${id}/report`, {
        method: "POST",
        cookie: a.cookie,
      })
    ).status,
    200,
  );
  assert.equal((await request(`/api/gifs/${id}`)).status, 200);
  const admin = await request("/api/auth/login", {
    method: "POST",
    body: { email: "inviter@example.com", password: "correct horse battery" },
  });
  const review = await request("/api/admin/gifs", { cookie: admin.cookie });
  assert.ok(review.data.gifs.some((g) => g.id === id && g.reported));
  await request(`/api/admin/gifs/${id}/review`, {
    method: "POST",
    cookie: admin.cookie,
    body: { status: "approved" },
  });
  assert.ok(
    !(
      await request("/api/admin/gifs", { cookie: admin.cookie })
    ).data.gifs.some((g) => g.id === id),
  );
});
test("invitation credit stops at ten per UTC day and unlocks the earned rank", async () => {
  const inviter = await signup("capinviter"),
    admin = await request("/api/auth/login", {
      method: "POST",
      body: { email: "inviter@example.com", password: "correct horse battery" },
    });
  for (let i = 0; i < 11; i++) {
    const joined = await signup(`friend${i}`, inviter.data.user.inviteCode);
    const posted = await request("/api/gifs", {
      method: "POST",
      cookie: joined.cookie,
      body: uploadForm(),
    });
    assert.equal(posted.status, 201);
    await request(`/api/admin/gifs/${posted.data.gif.id}/review`, {
      method: "POST",
      cookie: admin.cookie,
      body: { status: "approved" },
    });
  }
  const me = await request("/api/me", { cookie: inviter.cookie });
  assert.equal(me.data.user.points, 520);
  assert.equal(me.data.user.rank.level, 3);
  assert.equal(me.data.user.rank.title, "Joy Collector");
  const dash = await request("/api/dashboard", { cookie: inviter.cookie });
  assert.equal(
    dash.data.invitations.filter((i) => i.rewardStatus === "capped").length,
    1,
  );
});
test("a new application instance restores accounts and existing sessions from disk", async () => {
  const a = await signup("persistent");
  const restored = createApp({ dataDir: dir, seed: false });
  const s = restored.app.listen(0, "127.0.0.1");
  await new Promise((r) => s.once("listening", r));
  try {
    const response = await fetch(
      `http://127.0.0.1:${s.address().port}/api/me`,
      { headers: { cookie: a.cookie } },
    );
    assert.equal((await response.json()).user.username, "persistent");
  } finally {
    await new Promise((r) => s.close(r));
    restored.db.close();
  }
});

test("restarting refreshes bundled media metadata while preserving customized titles", () => {
  const seedDir = mkdtempSync(`${tmpdir()}/cchp-seed-`);
  const initial = createApp({ dataDir: seedDir, seed: true });
  const g = initial.db
    .prepare("SELECT id,size FROM gifs WHERE filename='demo-cat-5.gif'")
    .get();
  assert.ok(g.size > 1000);
  initial.db
    .prepare(
      "UPDATE gifs SET size=1,title='Keep this custom caption' WHERE id=?",
    )
    .run(g.id);
  initial.db.close();
  const restored = createApp({ dataDir: seedDir, seed: true });
  try {
    const r = restored.db
      .prepare("SELECT size,title FROM gifs WHERE id=?")
      .get(g.id);
    assert.equal(r.size, g.size);
    assert.equal(r.title, "Keep this custom caption");
  } finally {
    restored.db.close();
    rmSync(seedDir, { recursive: true, force: true });
  }
});
