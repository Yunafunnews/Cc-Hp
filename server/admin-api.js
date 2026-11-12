import { Router } from "express";
import { publicUser } from "./db.js";
const error = (status, message) =>
  Object.assign(new Error(message), { status });
const categories = [
  "cats",
  "dogs",
  "tiny-friends",
  "reactions",
  "sleepy",
  "playtime",
];
function pageQuery(query) {
  const page = query.page === undefined ? 1 : Number(query.page),
    limit = query.limit === undefined ? 20 : Number(query.limit);
  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    page > 100000 ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 100
  )
    throw error(400, "Invalid page or limit.");
  if (query.q !== undefined && typeof query.q !== "string")
    throw error(400, "Invalid search.");
  const q = (query.q || "").trim().slice(0, 80);
  return {
    page,
    limit,
    offset: (page - 1) * limit,
    q,
    pattern: `%${q.replace(/[\\%_]/g, "\\$&")}%`,
  };
}
export function registerAdminRoutes(app, { db, auth, admin, gifData }) {
  const router = Router();
  router.get("/overview", (req, res) => {
    const stats = db
      .prepare(
        `SELECT
   (SELECT COUNT(*) FROM users WHERE password_hash IS NOT NULL) AS members,
   (SELECT COUNT(*) FROM gifs) AS gifs,
   (SELECT COUNT(*) FROM gifs WHERE status='pending') AS pending,
   (SELECT COUNT(*) FROM gifs WHERE status='approved') AS approved,
   (SELECT COUNT(*) FROM reports WHERE resolved=0) AS reports,
   (SELECT COALESCE(SUM(downloads),0) FROM gifs) AS downloads,
   (SELECT COALESCE(SUM(amount),0) FROM points) AS totalPoints`,
      )
      .get();
    res.json({
      stats,
      recentGifs: db
        .prepare("SELECT id FROM gifs ORDER BY id DESC LIMIT 6")
        .all()
        .map((r) => gifData(r.id, req.userId)),
      rewards: db
        .prepare(
          "SELECT reason,SUM(amount) AS amount,COUNT(*) AS events FROM points GROUP BY reason ORDER BY amount DESC",
        )
        .all(),
    });
  });
  router.get("/gifs", (req, res) => {
    const { page, limit, offset, q, pattern } = pageQuery(req.query),
      status = req.query.status || "review";
    const filters = [],
      args = [];
    if (status === "review")
      filters.push(
        "(g.status IN ('pending','flagged') OR EXISTS(SELECT 1 FROM reports WHERE gif_id=g.id AND resolved=0))",
      );
    else if (status === "reported")
      filters.push(
        "EXISTS(SELECT 1 FROM reports WHERE gif_id=g.id AND resolved=0)",
      );
    else if (["pending", "approved", "rejected", "flagged"].includes(status)) {
      filters.push("g.status=?");
      args.push(status);
    } else if (status !== "all") throw error(400, "Invalid content status.");
    if (q) {
      filters.push(
        "(g.title LIKE ? ESCAPE '\\' OR g.tags LIKE ? ESCAPE '\\' OR u.username LIKE ? ESCAPE '\\')",
      );
      args.push(pattern, pattern, pattern);
    }
    const from = `FROM gifs g JOIN users u ON u.id=g.user_id ${filters.length ? "WHERE " + filters.join(" AND ") : ""}`;
    const total = db.prepare(`SELECT COUNT(*) AS n ${from}`).get(...args).n;
    const rows = db
      .prepare(`SELECT g.id ${from} ORDER BY g.id DESC LIMIT ? OFFSET ?`)
      .all(...args, limit, offset);
    res.json({
      gifs: rows.map((r) => gifData(r.id, req.userId)),
      total,
      page,
      limit,
    });
  });
  router.patch("/gifs/:id", (req, res) => {
    const { title, category, tags } = req.body;
    if (
      typeof title !== "string" ||
      title.trim().length < 2 ||
      title.trim().length > 100 ||
      !categories.includes(category) ||
      typeof tags !== "string" ||
      tags.length > 200
    )
      throw error(
        400,
        "Use a title of 2–100 characters, a valid category and up to 200 tag characters.",
      );
    const id = Number(req.params.id);
    if (
      !Number.isSafeInteger(id) ||
      id < 1 ||
      !db.prepare("SELECT id FROM gifs WHERE id=?").get(id)
    )
      throw error(404, "Loop not found.");
    const cleanTags = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .join(",");
    db.prepare("UPDATE gifs SET title=?,category=?,tags=? WHERE id=?").run(
      title.trim(),
      category,
      cleanTags,
      id,
    );
    res.json({ gif: gifData(id, req.userId) });
  });
  router.get("/users", (req, res) => {
    const { page, limit, offset, q, pattern } = pageQuery(req.query);
    const filter =
      "u.password_hash IS NOT NULL" +
      (q
        ? " AND (u.username LIKE ? ESCAPE '\\' OR u.email LIKE ? ESCAPE '\\')"
        : "");
    const args = q ? [pattern, pattern] : [];
    const total = db
      .prepare(`SELECT COUNT(*) AS n FROM users u WHERE ${filter}`)
      .get(...args).n;
    const users = db
      .prepare(
        `SELECT u.id,u.username,u.email,u.role,u.created_at AS createdAt,
   (SELECT COALESCE(SUM(amount),0) FROM points WHERE user_id=u.id) AS points,
   (SELECT COUNT(*) FROM gifs WHERE user_id=u.id AND status='approved') AS approvedUploads,
   (SELECT COUNT(*) FROM users WHERE invited_by=u.id) AS invitedCount
   FROM users u WHERE ${filter} ORDER BY u.id DESC LIMIT ? OFFSET ?`,
      )
      .all(...args, limit, offset);
    res.json({ users, total, page, limit });
  });
  router.get("/users/:id", (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1)
      throw error(404, "Member not found.");
    const user = publicUser(db, id);
    if (
      !user ||
      !db
        .prepare(
          "SELECT id FROM users WHERE id=? AND password_hash IS NOT NULL",
        )
        .get(id)
    )
      throw error(404, "Member not found.");
    const stats = db
      .prepare(
        `SELECT (SELECT COUNT(*) FROM gifs WHERE user_id=? AND status='approved') AS approvedUploads,(SELECT COUNT(*) FROM gifs WHERE user_id=?) AS uploads,(SELECT COUNT(*) FROM users WHERE invited_by=?) AS invitedCount`,
      )
      .get(id, id, id);
    const ledger = db
      .prepare(
        "SELECT id,amount,reason,created_at AS createdAt FROM points WHERE user_id=? ORDER BY id DESC LIMIT 20",
      )
      .all(id);
    res.json({ user, stats, ledger });
  });
  router.get("/points", (req, res) => {
    const { page, limit, offset, q, pattern } = pageQuery(req.query);
    const where = q
      ? "WHERE (u.username LIKE ? ESCAPE '\\' OR u.email LIKE ? ESCAPE '\\' OR p.reason LIKE ? ESCAPE '\\')"
      : "";
    const args = q ? [pattern, pattern, pattern] : [];
    const from = `FROM points p JOIN users u ON u.id=p.user_id ${where}`;
    const total = db.prepare(`SELECT COUNT(*) AS n ${from}`).get(...args).n;
    const entries = db
      .prepare(
        `SELECT p.id,p.user_id AS userId,u.username,p.amount,p.reason,p.created_at AS createdAt ${from} ORDER BY p.id DESC LIMIT ? OFFSET ?`,
      )
      .all(...args, limit, offset);
    res.json({ entries, total, page, limit });
  });
  app.use("/api/admin", auth, admin, router);
}
