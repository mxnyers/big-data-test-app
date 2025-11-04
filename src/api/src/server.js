import "dotenv/config.js";
import express from "express";
import helmet from "helmet";
import compression from "compression";
import installDynamic from "./routes/dynamic.js";
import pino from "pino";
import pinoHttp from "pino-http";

const app = express();
const logger = pino({ level: process.env.LOG_LEVEL || "info" });

app.use(helmet());
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(pinoHttp({ logger }));

app.get("/healthz", (_, res) => res.json({ ok: true, ts: new Date().toISOString() }));
installDynamic(app); // exposes /api/<your-sql-files>

const port = process.env.PORT || 8080;
app.listen(port, () => logger.info({ port }, "API listening"));
