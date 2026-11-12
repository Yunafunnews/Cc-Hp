import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { app, db } = createApp();
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(root, "dist")));
  app.get("/{*path}", (req, res) =>
    res.sendFile(path.join(root, "dist/index.html")),
  );
} else {
  const { createServer } = await import("vite");
  const vite = await createServer({
    server: {
      middlewareMode: true,
      hmr: { port: 24678 + (Number(process.env.PORT) || 3000) - 3000 },
    },
    appType: "spa",
  });
  app.use(vite.middlewares);
}
const server = app.listen(Number(process.env.PORT) || 3000, "0.0.0.0", () =>
  console.log(`Pawloop listening on port ${server.address().port}`),
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () =>
    server.close(() => {
      db.close();
      process.exit(0);
    }),
  );
