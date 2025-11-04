import { Router } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { cacheMiddleware } from '../middleware/cache.js';
import { databricksClient } from '../db/databricks.js';
import { redisCache } from '../cache/redis.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const QUERIES_DIR = path.join(__dirname, '../queries');
const SELECTS_DIR = path.join(QUERIES_DIR, 'selects');
const INSERTS_DIR = path.join(QUERIES_DIR, 'inserts');
const UPDATES_DIR = path.join(QUERIES_DIR, 'updates');
const DELETES_DIR = path.join(QUERIES_DIR, 'deletes');

export default async function installDynamic(app) {
  const router = Router();
  
  // Ensure queries directories exist
  const directories = [SELECTS_DIR, INSERTS_DIR];
  for (const dir of directories) {
  try {
      await fs.mkdir(dir, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
  }

  // Load SQL files from both directories
  const selectFiles = await fs.readdir(SELECTS_DIR);
  const insertFiles = await fs.readdir(INSERTS_DIR);
  const updateFiles = await fs.readdir(UPDATES_DIR);
  const deleteFiles = await fs.readdir(DELETES_DIR);

  // Create GET routes for select queries
  for (const file of selectFiles) {
    if (!file.endsWith('.sql')) continue;

    const routePath = `/api/${path.basename(file, '.sql')}`;
    const sqlContent = await fs.readFile(path.join(SELECTS_DIR, file), 'utf8');

    // GET endpoint with cache
    router.get(routePath, cacheMiddleware(300), async (req, res) => {
      try {
        const result = await databricksClient.query(sqlContent, req.query);
        res.json(result);
      } catch (err) {
        req.log.error({ err }, 'Query error');
        res.status(500).json({ error: 'Query execution failed' });
      }
    });
  }

  // Create POST routes for insert queries
  for (const file of insertFiles) {
    if (!file.endsWith('.sql')) continue;

    const routePath = `/api/${path.basename(file, '.sql')}`;
    const sqlContent = await fs.readFile(path.join(INSERTS_DIR, file), 'utf8');

    // POST endpoint for inserts
    router.post(routePath, async (req, res) => {
      try {
        // Queue write operation
        const writeKey = `write:${routePath}:${Date.now()}`;
        await redisCache.queueWrite(writeKey, {
          sql: sqlContent,
          params: req.body
        });

        // Return success immediately
        res.json({ status: 'queued', timestamp: new Date().toISOString() });

        // Process writes asynchronously
        const writes = await redisCache.getPendingWrites();
        await databricksClient.processWrites(writes);
        
        // Clear processed writes and invalidate related cache
        for (const write of writes) {
          await redisCache.removeWrite(write);
          // Invalidate the cache for the corresponding GET endpoint
          await redisCache.client.del(`GET:${routePath}`);
        }
      } catch (err) {
        req.log.error({ err }, 'Write error');
        res.status(500).json({ error: 'Write operation failed' });
      }
    });
  }

  // Create PUT routes for update queries
  for (const file of updateFiles) {
    if (!file.endsWith('.sql')) continue;

    const routePath = `/api/${path.basename(file, '.sql')}`;
    const sqlContent = await fs.readFile(path.join(UPDATES_DIR, file), 'utf8');

    // PUT endpoint for updates
    router.put(routePath, async (req, res) => {
      try {
        const writeKey = `write:${routePath}:update:${Date.now()}`;
        await redisCache.queueWrite(writeKey, {
          sql: sqlContent,
          params: req.body
        });

        res.json({ status: 'queued', timestamp: new Date().toISOString() });

        const writes = await redisCache.getPendingWrites();
        await databricksClient.processWrites(writes);

        for (const write of writes) {
          await redisCache.removeWrite(write);
          await redisCache.client.del(`GET:${routePath}`);
        }
      } catch (err) {
        req.log.error({ err }, 'Update error');
        res.status(500).json({ error: 'Update operation failed' });
      }
    });
  }

  // Create DELETE routes for delete queries
  for (const file of deleteFiles) {
    if (!file.endsWith('.sql')) continue;

    const routePath = `/api/${path.basename(file, '.sql')}`;
    const sqlContent = await fs.readFile(path.join(DELETES_DIR, file), 'utf8');

    // DELETE endpoint for deletes
    router.delete(routePath, async (req, res) => {
      try {
        const writeKey = `write:${routePath}:delete:${Date.now()}`;
        await redisCache.queueWrite(writeKey, {
          sql: sqlContent,
          params: req.body
        });

        res.json({ status: 'queued', timestamp: new Date().toISOString() });

        const writes = await redisCache.getPendingWrites();
        await databricksClient.processWrites(writes);

        for (const write of writes) {
          await redisCache.removeWrite(write);
          await redisCache.client.del(`GET:${routePath}`);
        }
      } catch (err) {
        req.log.error({ err }, 'Delete error');
        res.status(500).json({ error: 'Delete operation failed' });
      }
    });
  }

  app.use(router);
}
