import express from "express";
const app = express();
app.use("/Cc-Hp", express.static("dist"));
app.listen(3300, "127.0.0.1", () => console.log("Pages test server on 3300"));
