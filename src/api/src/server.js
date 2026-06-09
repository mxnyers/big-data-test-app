import "dotenv/config.js";
import express from "express";
import helmet from "helmet";
import compression from "compression";
import installDynamic from "./routes/dynamic.js";
import clientLogsRouter from "./routes/client-logs.js";
import { logger, trackEvent, shutdownTracing } from "./config/logger.js";
import { pgClient } from './db/postgres.js';
import { userContextMiddleware } from './middleware/user-context.js';
import { memoryState } from './state/memory-state.js';

const app = express();

// OpenTelemetry HTTP logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      userAgent: req.get('user-agent'),
    };
    
    if (res.statusCode >= 400) {
      logger.error(`${req.method} ${req.url} ${res.statusCode}`, logData);
    } else {
      logger.info(`${req.method} ${req.url} ${res.statusCode}`, logData);
    }
  });
  
  next();
});

app.use(helmet());
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(express.text({ type: 'text/plain', limit: "1mb" })); // For sendBeacon support
app.use(userContextMiddleware);

app.get("/healthz", (_, res) => res.json({ ok: true, ts: new Date().toISOString() }));


app.get("/status", async (_, res) => {
  try {
    // Use Postgres client directly for health/status
    const dbClient = pgClient;
    // Simple connection check
    await dbClient.query('SELECT 1');
    const dbStatus = dbClient.getConnectionStatus();
    const stateStats = memoryState.getStats();
    res.json({
      ok: true,
      timestamp: new Date().toISOString(),
      database: dbStatus,
      state: stateStats
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Database connection failed', message: err.message });
  }
});

async function startServer() {
  try {
    console.log('Starting server (console)');
    logger.info('Starting server');

    // Use Postgres client directly
    const dbClient = pgClient;
    const dbType = 'postgres';

    // Initialize connection pool
    console.log(`Connecting to ${dbType}... (console)`);
    logger.info({ dbType }, `Connecting to ${dbType}...`);
    await dbClient.connect();
    console.log(`${dbType} connection pool initialized (console)`);
    logger.info(`${dbType} connection pool initialized`);

    // Test connection
    console.log(`Testing ${dbType} connection... (console)`);
    logger.info({ dbType }, `Testing ${dbType} connection...`);
    await dbClient.query('SELECT 1');
    console.log(`${dbType} connection initialized (console)`);
    logger.info(`${dbType} connection initialized`);
    trackEvent(`${dbType}Connected`, { timestamp: new Date().toISOString() });

    // Install dynamic routes
    console.log('Installing dynamic routes (console)');
    logger.info('Installing dynamic routes');
    await installDynamic(app);
    console.log('Dynamic routes installed (console)');
    logger.info('Dynamic routes installed');
    trackEvent('RoutesInstalled', { timestamp: new Date().toISOString() });

    // Install client logs routes (frontend logging)
    app.use('/api/logs', clientLogsRouter);
    console.log('Client logs routes installed (console)');
    logger.info('Client logs routes installed');

    // Start listening
    const port = process.env.PORT || 8080;
    app.listen(port, () => {
      console.log(`API listening on port ${port} (console)`);
      logger.info({ port, dbType }, "API listening");
      trackEvent('ServerStarted', { port, dbType, timestamp: new Date().toISOString() });
    });
  } catch (err) {
    // Print full stack to console first to ensure visibility in container logs
    try {
      console.error('Failed to start server - error stack (console):', err && err.stack ? err.stack : err);
    } catch (e) {
      console.error('Failed to print error stack to console', e);
    }

    try {
      logger.error({ err }, "Failed to start server");
    } catch (e) {
      console.error('logger.error failed:', e && e.stack ? e.stack : e);
    }

    try {
      trackEvent('ServerStartupFailed', { error: err && err.message ? err.message : String(err) });
    } catch (e) {
      console.error('trackEvent failed:', e && e.stack ? e.stack : e);
    }

    try {
      await shutdownTracing();
    } catch (e) {
      console.error('shutdownTracing failed:', e && e.stack ? e.stack : e);
    }

    process.exit(1);
  }
}

startServer();

// Global handlers to capture otherwise-silent crashes and ensure tracing is shutdown
process.on('uncaughtException', async (err) => {
  try {
    logger.error({ err }, 'Uncaught exception');
  } catch (e) {
    console.error('Uncaught exception (logger failed):', e);
  }
  try {
    await shutdownTracing();
  } catch (e) {
    // ignore
  }
  process.exit(1);
});

process.on('unhandledRejection', async (reason) => {
  try {
    logger.error({ err: reason }, 'Unhandled promise rejection');
  } catch (e) {
    console.error('Unhandled rejection (logger failed):', e);
  }
  try {
    await shutdownTracing();
  } catch (e) {
    // ignore
  }
  process.exit(1);
});
