import express from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import multer from "multer";
import sharp from "sharp";
import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  openDb,
  publicUser,
  seedDb,
  award,
  transaction,
  levels,
} from "./db.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const hash = (value) => createHash("sha256").update(value).digest("hex");
const code = () => randomBytes(6).toString("hex").toUpperCase();
const day = () => new Date().toISOString().slice(0, 10);
const categories = [
  "cats",
  "dogs",
  "tiny-friends",
  "reactions",
  "sleepy",
  "playtime",
];
const fail = (status, message) => Object.assign(new Error(message), { status });
const text = (value, max) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";
const passwordHash = (password) => {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
};
const passwordValid = (password, stored) => {
  if (!stored) return false;
  const [salt, key] = stored.split(":");
  return timingSafeEqual(
    Buffer.from(key, "hex"),
    scryptSync(password, salt, 64),
  );
};

export function createApp({
  dataDir = process.env.DATA_DIR || path.join(root, "data"),
  seed = true,
} = {}) {
  dataDir = path.resolve(dataDir);
  const db = openDb(dataDir);
  if (seed && existsSync(path.join(root, "public/gifs/manifest.json")))
    seedDb(
      db,
      JSON.parse(
        readFileSync(path.join(root, "public/gifs/manifest.json"), "utf8"),
      ),
    );
  const app = express();
  app.disable("x-powered-by");
  app.use(
    helmet({
      contentSecurityPolicy:
        process.env.NODE_ENV === "production"
          ? {
              directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:", "blob:"],
                connectSrc: ["'self'"],
                upgradeInsecureRequests: null,
              },
            }
          : false,
    }),
  );
  app.use("/api", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      const origin = req.get("origin");
      if (req.get("sec-fetch-site") === "cross-site")
        return next(fail(403, "Cross-site request blocked."));
      if (origin) {
        try {
          if (new URL(origin).host !== req.get("host"))
            return next(fail(403, "Cross-site request blocked."));
        } catch {
          return next(fail(403, "Invalid origin."));
        }
      }
    }
    next();
  });
  app.use(express.json({ limit: "64kb" }));
  app.use((req, res, next) => {
    req.body ??= {};
    next();
  });
  app.use(
    "/api",
    rateLimit({
      windowMs: 60_000,
      limit: 180,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: { error: "Too many requests. Please try again in a minute." },
    }),
  );
  app.use(
    "/api/auth",
    rateLimit({
      windowMs: 15 * 60_000,
      limit: 40,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: { error: "Too many sign-in attempts. Please try again later." },
    }),
  );
  app.use((req, res, next) => {
    const raw = (req.headers.cookie || "")
      .split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("pawloop_session="))
      ?.split("=")[1];
    req.sessionHash = raw ? hash(raw) : null;
    req.userId = raw
      ? db
          .prepare("SELECT user_id FROM sessions WHERE token=? AND expires>?")
          .get(req.sessionHash, Date.now())?.user_id
      : null;
    next();
  });
  const auth = (req, res, next) =>
    req.userId
      ? next()
      : next(fail(401, "Sign in to keep the good loops going."));
  const admin = (req, res, next) =>
    db.prepare("SELECT role FROM users WHERE id=?").get(req.userId)?.role ===
    "admin"
      ? next()
      : next(fail(403, "Administrator access required."));
  const session = (res, id) => {
    const raw = randomBytes(32).toString("hex");
    db.prepare("DELETE FROM sessions WHERE expires<?").run(Date.now());
    db.prepare("INSERT INTO sessions VALUES (?,?,?)").run(
      hash(raw),
      id,
      Date.now() + 30 * 86400_000,
    );
    res.cookie("pawloop_session", raw, {
      httpOnly: true,
      sameSite: "lax",
      secure:
        process.env.COOKIE_SECURE === "true" ||
        (process.env.NODE_ENV === "production" &&
          process.env.COOKIE_SECURE !== "false"),
      maxAge: 30 * 86400_000,
      path: "/",
    });
  };
  const gifData = (id, viewer) => {
    const g = db
      .prepare(
        `SELECT g.*,u.username,(SELECT COUNT(*) FROM likes WHERE gif_id=g.id) AS likes,
    EXISTS(SELECT 1 FROM likes WHERE gif_id=g.id AND user_id=?) AS liked,
    EXISTS(SELECT 1 FROM saves WHERE gif_id=g.id AND user_id=?) AS saved, EXISTS(SELECT 1 FROM reports WHERE gif_id=g.id AND resolved=0) AS reported FROM gifs g JOIN users u ON u.id=g.user_id WHERE g.id=?`,
      )
      .get(viewer || 0, viewer || 0, id);
    if (!g) return null;
    return {
      id: g.id,
      title: g.title,
      category: g.category,
      tags: g.tags.split(",").filter(Boolean),
      width: g.width,
      height: g.height,
      size: g.size,
      status: g.status,
      source: g.source,
      downloads: g.downloads,
      likes: g.likes,
      liked: !!g.liked,
      saved: !!g.saved,
      reported: !!g.reported,
      username: g.filename.startsWith("demo-") ? "cc&hp Studio" : g.username,
      userId: g.user_id,
      createdAt: g.created_at,
      url: g.filename.startsWith("demo-")
        ? `/gifs/${g.filename}`
        : `/media/${g.id}`,
    };
  };
  const readable = (req, id) => {
    const g = gifData(id, req.userId);
    if (
      !g ||
      (g.status !== "approved" &&
        g.userId !== req.userId &&
        db.prepare("SELECT role FROM users WHERE id=?").get(req.userId || 0)
          ?.role !== "admin")
    )
      throw fail(404, "This loop could not be found.");
    return g;
  };
  const approved = (req, id) => {
    const g = readable(req, id);
    if (g.status !== "approved")
      throw fail(404, "This loop is not published yet.");
    return g;
  };
  app.get("/api/health", (req, res) => res.json({ ok: true }));
  app.get("/api/me", (req, res) =>
    res.json({ user: req.userId ? publicUser(db, req.userId) : null }),
  );
  app.post("/api/auth/register", (req, res) => {
    const username = text(req.body.username, 30),
      email = text(req.body.email, 254).toLowerCase(),
      password = req.body.password,
      invite = text(req.body.invite, 24).toUpperCase();
    if (!/^[\p{L}\p{N}_ .-]{2,30}$/u.test(username))
      throw fail(400, "Choose a name between 2 and 30 characters.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw fail(400, "Enter a valid email address.");
    if (
      typeof password !== "string" ||
      password.length < 10 ||
      password.length > 128
    )
      throw fail(400, "Use a password between 10 and 128 characters.");
    const ref = invite
      ? db.prepare("SELECT id FROM users WHERE invite_code=?").get(invite)
      : null;
    if (invite && !ref) throw fail(400, "This invitation code is not valid.");
    if (
      db
        .prepare("SELECT id FROM users WHERE email=? OR username=?")
        .get(email, username)
    )
      throw fail(409, "That email or name is already in use.");
    const stored = passwordHash(password);
    const id = transaction(db, () => {
      const result = db
        .prepare(
          "INSERT INTO users(username,email,password_hash,invite_code,invited_by) VALUES (?,?,?,?,?)",
        )
        .run(username, email, stored, code(), ref?.id ?? null);
      const id = Number(result.lastInsertRowid);
      award(db, id, 20, "welcome", `welcome:${id}`);
      return id;
    });
    session(res, id);
    res.status(201).json({ user: publicUser(db, id) });
  });
  app.post("/api/auth/login", (req, res) => {
    if (
      typeof req.body.email !== "string" ||
      typeof req.body.password !== "string"
    )
      throw fail(400, "Enter your email and password.");
    const email = text(req.body.email, 254).toLowerCase(),
      password = req.body.password;
    const user = db
      .prepare("SELECT id,password_hash FROM users WHERE email=?")
      .get(email);
    if (
      typeof password !== "string" ||
      password.length > 128 ||
      !user ||
      !passwordValid(password, user.password_hash)
    )
      throw fail(401, "Email or password is incorrect.");
    session(res, user.id);
    res.json({ user: publicUser(db, user.id) });
  });
  app.post("/api/auth/logout", (req, res) => {
    if (req.sessionHash)
      db.prepare("DELETE FROM sessions WHERE token=?").run(req.sessionHash);
    res.clearCookie("pawloop_session", { path: "/" });
    res.json({ ok: true });
  });
  app.get("/api/stats", (req, res) =>
    res.json({
      gifs: db
        .prepare("SELECT COUNT(*) AS n FROM gifs WHERE status='approved'")
        .get().n,
      members: db
        .prepare(
          "SELECT COUNT(*) AS n FROM users WHERE password_hash IS NOT NULL",
        )
        .get().n,
      downloads: db
        .prepare("SELECT COALESCE(SUM(downloads),0) AS n FROM gifs")
        .get().n,
    }),
  );
  app.get("/api/gifs", (req, res) => {
    const clauses = ["g.status='approved'"],
      args = [];
    if (req.query.saved === "1") {
      if (!req.userId) throw fail(401, "Sign in to view your collection.");
      clauses.push(
        "EXISTS (SELECT 1 FROM saves s WHERE s.gif_id=g.id AND s.user_id=?)",
      );
      args.push(req.userId);
    }
    if (req.query.category && categories.includes(req.query.category)) {
      clauses.push("g.category=?");
      args.push(req.query.category);
    }
    const q = text(req.query.q, 80);
    if (q) {
      clauses.push("(g.title LIKE ? ESCAPE '\\' OR g.tags LIKE ? ESCAPE '\\')");
      const value = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
      args.push(value, value);
    }
    const sort =
      req.query.sort === "newest"
        ? "g.id DESC"
        : req.query.sort === "popular"
          ? "score DESC,g.downloads DESC,g.id DESC"
          : "g.id ASC";
    const rows = db
      .prepare(
        `SELECT g.id,(SELECT COUNT(*) FROM likes WHERE gif_id=g.id) AS score FROM gifs g WHERE ${clauses.join(" AND ")} ORDER BY ${sort} LIMIT 120`,
      )
      .all(...args);
    res.json({ gifs: rows.map((r) => gifData(r.id, req.userId)) });
  });
  app.get("/api/gifs/:id", (req, res) => {
    const gif = readable(req, req.params.id);
    const comments = db
      .prepare(
        "SELECT c.id,c.text,c.created_at AS createdAt,u.username FROM comments c JOIN users u ON u.id=c.user_id WHERE gif_id=? ORDER BY c.id DESC LIMIT 100",
      )
      .all(gif.id);
    res.json({ gif, comments });
  });
  app.get("/media/:id", (req, res, next) => {
    try {
      const g = readable(req, req.params.id);
      const row = db.prepare("SELECT filename FROM gifs WHERE id=?").get(g.id);
      res
        .set(
          "Cache-Control",
          g.status === "approved" ? "public,max-age=86400" : "private,no-store",
        )
        .type("gif")
        .sendFile(path.join(dataDir, "uploads", path.basename(row.filename)));
    } catch (e) {
      next(e);
    }
  });
  app.get("/api/gifs/:id/download", (req, res) => {
    const g = approved(req, req.params.id),
      row = db.prepare("SELECT filename FROM gifs WHERE id=?").get(g.id);
    db.prepare("UPDATE gifs SET downloads=downloads+1 WHERE id=?").run(g.id);
    const file = g.url.startsWith("/gifs/")
      ? path.join(root, "public/gifs", row.filename)
      : path.join(dataDir, "uploads", row.filename);
    res.download(
      file,
      `${g.title.replace(/[^a-zA-Z0-9-]/g, "-").slice(0, 60) || "cc-hp"}.gif`,
    );
  });
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 15 * 1024 * 1024,
      files: 1,
      fields: 5,
      fieldSize: 2048,
    },
  });
  app.post(
    "/api/gifs",
    auth,
    rateLimit({
      windowMs: 3600_000,
      limit: 20,
      message: { error: "Upload limit reached. Try again in an hour." },
    }),
    upload.single("file"),
    async (req, res) => {
      const title = text(req.body.title, 100),
        category = text(req.body.category, 30),
        tags = text(req.body.tags, 200);
      if (title.length < 2 || !categories.includes(category) || !req.file)
        throw fail(400, "Add a title, category and GIF file.");
      if (
        !["GIF87a", "GIF89a"].includes(
          req.file.buffer.subarray(0, 6).toString(),
        )
      )
        throw fail(400, "Please upload a valid GIF file.");
      let meta;
      try {
        meta = await sharp(req.file.buffer, {
          limitInputPixels: 20_000_000,
        }).metadata();
        if (
          meta.format !== "gif" ||
          meta.width > 4096 ||
          meta.height > 4096 ||
          (meta.pages || 1) > 500
        )
          throw new Error();
        await sharp(req.file.buffer, { limitInputPixels: 20_000_000 })
          .raw()
          .toBuffer();
      } catch {
        throw fail(
          400,
          "This GIF could not be decoded, or exceeds 4096px / 500 frames.",
        );
      }
      const filename = `${randomBytes(20).toString("hex")}.gif`;
      writeFileSync(path.join(dataDir, "uploads", filename), req.file.buffer, {
        flag: "wx",
      });
      const id = Number(
        db
          .prepare(
            "INSERT INTO gifs(user_id,title,category,tags,filename,width,height,size) VALUES (?,?,?,?,?,?,?,?)",
          )
          .run(
            req.userId,
            title,
            category,
            tags,
            filename,
            meta.width,
            meta.height,
            req.file.size,
          ).lastInsertRowid,
      );
      res.status(201).json({ gif: gifData(id, req.userId) });
    },
  );
  for (const action of ["like", "save"])
    app.post(`/api/gifs/:id/${action}`, auth, (req, res) => {
      const g = approved(req, req.params.id),
        table = action === "like" ? "likes" : "saves";
      if (
        db
          .prepare(`SELECT 1 FROM ${table} WHERE user_id=? AND gif_id=?`)
          .get(req.userId, g.id)
      )
        db.prepare(`DELETE FROM ${table} WHERE user_id=? AND gif_id=?`).run(
          req.userId,
          g.id,
        );
      else
        db.prepare(`INSERT INTO ${table}(user_id,gif_id) VALUES (?,?)`).run(
          req.userId,
          g.id,
        );
      res.json({ gif: gifData(g.id, req.userId) });
    });
  app.post("/api/gifs/:id/comments", auth, (req, res) => {
    const g = approved(req, req.params.id),
      message = text(req.body.text, 1000);
    if (!message) throw fail(400, "Write something before posting.");
    db.prepare("INSERT INTO comments(user_id,gif_id,text) VALUES (?,?,?)").run(
      req.userId,
      g.id,
      message,
    );
    res.status(201).json({ ok: true });
  });
  app.post("/api/gifs/:id/report", auth, (req, res) => {
    const g = approved(req, req.params.id);
    db.prepare(
      "INSERT INTO reports(user_id,gif_id) VALUES (?,?) ON CONFLICT(user_id,gif_id) DO UPDATE SET resolved=0",
    ).run(req.userId, g.id);
    res.json({ ok: true });
  });
  app.post("/api/tasks/checkin", auth, (req, res) => {
    if (!award(db, req.userId, 10, "checkin", `checkin:${req.userId}:${day()}`))
      throw fail(409, "You have already checked in today.");
    res.json({ user: publicUser(db, req.userId) });
  });
  app.get("/api/dashboard", auth, (req, res) => {
    res.json({
      user: publicUser(db, req.userId),
      levels,
      checkedIn: !!db
        .prepare("SELECT id FROM points WHERE event_key=?")
        .get(`checkin:${req.userId}:${day()}`),
      firstUpload: !!db
        .prepare("SELECT id FROM points WHERE event_key=?")
        .get(`first-upload:${req.userId}`),
      invitations: db
        .prepare(
          "SELECT u.username,u.created_at AS createdAt,EXISTS(SELECT 1 FROM points p WHERE p.event_key='invite:'||u.id) AS rewarded, CASE WHEN EXISTS(SELECT 1 FROM points WHERE event_key='invite:'||u.id) THEN 'rewarded' WHEN EXISTS(SELECT 1 FROM points WHERE event_key='first-upload:'||u.id) THEN 'capped' ELSE 'pending' END AS rewardStatus FROM users u WHERE invited_by=? ORDER BY u.id DESC LIMIT 100",
        )
        .all(req.userId),
      ledger: db
        .prepare(
          "SELECT amount,reason,created_at AS createdAt FROM points WHERE user_id=? ORDER BY id DESC LIMIT 50",
        )
        .all(req.userId),
      uploads: db
        .prepare("SELECT id FROM gifs WHERE user_id=? ORDER BY id DESC")
        .all(req.userId)
        .map((r) => gifData(r.id, req.userId)),
    });
  });
  app.get("/api/admin/gifs", auth, admin, (req, res) =>
    res.json({
      gifs: db
        .prepare(
          "SELECT id FROM gifs WHERE status IN ('pending','flagged') OR EXISTS(SELECT 1 FROM reports WHERE gif_id=gifs.id AND resolved=0) ORDER BY id ASC",
        )
        .all()
        .map((r) => gifData(r.id, req.userId)),
    }),
  );
  app.post("/api/admin/gifs/:id/review", auth, admin, (req, res) => {
    const status = req.body.status;
    if (!["approved", "rejected"].includes(status))
      throw fail(400, "Choose approve or reject.");
    const gif = db.prepare("SELECT * FROM gifs WHERE id=?").get(req.params.id);
    if (!gif) throw fail(404, "Loop not found.");
    transaction(db, () => {
      db.prepare("UPDATE gifs SET status=? WHERE id=?").run(status, gif.id);
      db.prepare("UPDATE reports SET resolved=1 WHERE gif_id=?").run(gif.id);
      if (status !== "approved") return;
      award(db, gif.user_id, 25, "upload", `upload:${gif.id}`);
      const first = award(
        db,
        gif.user_id,
        30,
        "first-upload",
        `first-upload:${gif.user_id}`,
      );
      const ref = db
        .prepare("SELECT invited_by FROM users WHERE id=?")
        .get(gif.user_id).invited_by;
      if (first && ref) {
        const count = db
          .prepare(
            "SELECT COUNT(*) AS n FROM points WHERE user_id=? AND reason='invite' AND substr(created_at,1,10)=?",
          )
          .get(ref, day()).n;
        if (count < 10) award(db, ref, 50, "invite", `invite:${gif.user_id}`);
      }
    });
    res.json({ gif: gifData(gif.id, req.userId) });
  });
  app.use("/api", (req, res) =>
    res.status(404).json({ error: "API route not found." }),
  );
  app.use(express.static(path.join(root, "public"), { index: false }));
  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    const status =
      err.code === "LIMIT_FILE_SIZE"
        ? 413
        : err instanceof multer.MulterError
          ? 400
          : err.status || 500;
    if (status === 500) console.error(err);
    res.status(status).json({
      error:
        err.code === "LIMIT_FILE_SIZE"
          ? "GIF must be smaller than 15 MB."
          : status === 500
            ? "Something went wrong. Please try again."
            : err.message,
    });
  });
  return { app, db };
}
