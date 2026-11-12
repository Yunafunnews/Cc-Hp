import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createStaticApi } from "../src/pages-api.js";
let server, request;
before(async () => {
  const app = express();
  app.use("/Cc-Hp", express.static("public"));
  server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  request = createStaticApi({
    baseUrl: `http://127.0.0.1:${server.address().port}/Cc-Hp/`,
  });
});
after(async () => {
  await new Promise((r) => server?.close(r));
});
test("Pages gallery loads real local GIFs below the project base and searches tags", async () => {
  const all = await request("/gifs");
  assert.ok(all.gifs.length >= 10);
  assert.match(all.gifs[0].url, /\/Cc-Hp\/gifs\/demo-cat-/);
  for (const gif of all.gifs) {
    const file = await fetch(gif.url);
    assert.equal(file.status, 200);
    const bytes = Buffer.from(await file.arrayBuffer());
    assert.ok(bytes.subarray(0, 6).toString().startsWith("GIF8"), gif.url);
    assert.equal(bytes.length, gif.size);
  }
  const cats = await request("/gifs?category=cats");
  assert.ok(cats.gifs.length > 0);
  assert.ok(cats.gifs.every((g) => g.category === "cats"));
  const found = await request("/gifs?q=weekend");
  assert.ok(found.gifs.length > 0);
  assert.ok(
    found.gifs.every(
      (g) =>
        g.tags.includes("weekend") || g.title.toLowerCase().includes("weekend"),
    ),
  );
  assert.equal((await request("/gifs?q=zzzzmissing")).gifs.length, 0);
});
test("Pages detail resolves IDs independently, sorts newest, and never invents authenticated data", async () => {
  const list = await request("/gifs?sort=newest");
  assert.ok(list.gifs[0].id > list.gifs.at(-1).id);
  const detail = await request(`/gifs/${list.gifs[0].id}`);
  assert.equal(detail.gif.id, list.gifs[0].id);
  assert.deepEqual(detail.comments, []);
  assert.deepEqual(await request("/me"), { user: null });
  await assert.rejects(
    request("/auth/register", { method: "POST", body: {} }),
    { status: 503 },
  );
  await assert.rejects(request("/dashboard"), { status: 503 });
  await assert.rejects(request("/gifs/99999"), { status: 404 });
});
