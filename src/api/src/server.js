import "dotenv/config.js";
import express from "express";
import helmet from "helmet";
import compression from "compression";
import installDynamic from "./routes/dynamic.js";
import pino from "pino";
import pinoHttp from "pino-http";
import { redisCache } from './cache/redis.js';
import { databricksClient } from './db/databricks.js';

const app = express();
const logger = pino({ level: process.env.LOG_LEVEL || "info" });

app.use(helmet());
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(pinoHttp({ logger }));

app.get("/healthz", (_, res) => res.json({ ok: true, ts: new Date().toISOString() }));

async function startServer() {
  try {
    // Connect to Redis first
    logger.info('Connecting to Redis...');
    await redisCache.connect();
    logger.info('Redis connected successfully');

    // Connect to Databricks
    logger.info('Connecting to Databricks...');
    await databricksClient.connect();
    logger.info('Databricks connected successfully');

    // Install dynamic routes
    await installDynamic(app);
    logger.info('Dynamic routes installed');

    // Start listening
    const port = process.env.PORT || 8080;
    app.listen(port, () => logger.info({ port }, "API listening"));
  } catch (err) {
    logger.error({ err }, "Failed to start server");
    process.exit(1);
  }
}

startServer();
