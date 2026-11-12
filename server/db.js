import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";

export const levels = [
  { level: 1, min: 0, title: "Curious Paw", badge: "paw" },
  { level: 2, min: 100, title: "Happy Camper", badge: "sprout" },
  { level: 3, min: 300, title: "Joy Collector", badge: "heart" },
  { level: 4, min: 700, title: "Loop Legend", badge: "star" },
  { level: 5, min: 1500, title: "Paw Royalty", badge: "crown" },
];
export function openDb(dataDir) {
  mkdirSync(path.join(dataDir, "uploads"), { recursive: true });
  const db = new DatabaseSync(path.join(dataDir, "pawloop.sqlite"));
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY, username TEXT NOT NULL COLLATE NOCASE UNIQUE,
    email TEXT NOT NULL COLLATE NOCASE UNIQUE, password_hash TEXT,
    invite_code TEXT NOT NULL UNIQUE, invited_by INTEGER REFERENCES users(id),
    role TEXT NOT NULL DEFAULT 'member', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), expires INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS gifs (
    id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id),
    title TEXT NOT NULL, category TEXT NOT NULL, tags TEXT NOT NULL DEFAULT '',
    filename TEXT NOT NULL, width INTEGER NOT NULL, height INTEGER NOT NULL,
    size INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'pending',
    source TEXT NOT NULL DEFAULT '', downloads INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS points (
    id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id),
    amount INTEGER NOT NULL, reason TEXT NOT NULL, event_key TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS likes (user_id INTEGER NOT NULL REFERENCES users(id), gif_id INTEGER NOT NULL REFERENCES gifs(id), PRIMARY KEY(user_id,gif_id));
  CREATE TABLE IF NOT EXISTS saves (user_id INTEGER NOT NULL REFERENCES users(id), gif_id INTEGER NOT NULL REFERENCES gifs(id), PRIMARY KEY(user_id,gif_id));
  CREATE TABLE IF NOT EXISTS comments (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), gif_id INTEGER NOT NULL REFERENCES gifs(id), text TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
  CREATE TABLE IF NOT EXISTS reports (user_id INTEGER NOT NULL REFERENCES users(id), gif_id INTEGER NOT NULL REFERENCES gifs(id), resolved INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(user_id,gif_id));
  CREATE INDEX IF NOT EXISTS gifs_status ON gifs(status,created_at);
  CREATE INDEX IF NOT EXISTS points_user ON points(user_id);
  `);
  return db;
}
export function transaction(db, fn) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const value = fn();
    db.exec("COMMIT");
    return value;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
export function award(db, userId, amount, reason, eventKey) {
  return (
    db
      .prepare(
        "INSERT OR IGNORE INTO points(user_id,amount,reason,event_key) VALUES (?,?,?,?)",
      )
      .run(userId, amount, reason, eventKey).changes > 0
  );
}
export function publicUser(db, id) {
  const row = db
    .prepare(
      "SELECT id,username,email,invite_code AS inviteCode,role,created_at AS createdAt FROM users WHERE id=?",
    )
    .get(id);
  if (!row) return null;
  const points = db
    .prepare(
      "SELECT COALESCE(SUM(amount),0) AS total FROM points WHERE user_id=?",
    )
    .get(id).total;
  const current = [...levels].reverse().find((l) => points >= l.min);
  return {
    ...row,
    points,
    rank: current,
    nextRank: levels[current.level] ?? null,
  };
}
export function seedDb(db, media) {
  if (!media.length) return;
  if (db.prepare("SELECT COUNT(*) AS n FROM gifs").get().n) {
    transaction(db, () => {
      const update = db.prepare(
        "UPDATE gifs SET size=?,width=?,height=? WHERE filename=? AND filename LIKE 'demo-%'",
      );
      for (const g of media) update.run(g.size, g.width, g.height, g.filename);
    });
    return;
  }
  transaction(db, () => {
    db.prepare(
      "INSERT OR IGNORE INTO users(username,email,invite_code,role) VALUES ('cc&hp Studio','studio@pawloop.invalid','PAWSTUDIO','curator')",
    ).run();
    const owner = db
      .prepare("SELECT id FROM users WHERE invite_code='PAWSTUDIO'")
      .get().id;
    for (const g of media)
      db.prepare(
        "INSERT INTO gifs(user_id,title,category,tags,filename,width,height,size,status,source) VALUES (?,?,?,?,?,?,?,?,'approved',?)",
      ).run(
        owner,
        g.title,
        g.category,
        g.tags,
        g.filename,
        g.width,
        g.height,
        g.size,
        g.source,
      );
  });
}
