import path from "node:path";
import { openDb } from "./db.js";
const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Usage: npm run admin -- registered-email@example.com");
  process.exit(1);
}
const db = openDb(process.env.DATA_DIR || path.resolve("data"));
const result = db
  .prepare(
    "UPDATE users SET role='admin' WHERE email=? AND password_hash IS NOT NULL",
  )
  .run(email);
console.log(
  result.changes
    ? "Administrator role granted. Sign in and open the moderation page."
    : "No registered account found. Register through the website first.",
);
db.close();
if (!result.changes) process.exitCode = 1;
