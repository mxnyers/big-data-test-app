import { Router } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pgClient } from '../db/postgres.js';
import { memoryState } from '../state/memory-state.js';
import { logger } from '../config/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const QUERIES_DIR = path.join(__dirname, '../queries');
const SELECTS_DIR = path.join(QUERIES_DIR, 'selects');
const INSERTS_DIR = path.join(QUERIES_DIR, 'inserts');
const UPDATES_DIR = path.join(QUERIES_DIR, 'updates');
const DELETES_DIR = path.join(QUERIES_DIR, 'deletes');

// Helper function to replace schema placeholders in SQL
function replaceSqlPlaceholders(sql) {
  const schema = process.env.LAKEBASE_SCHEMA;
  return sql.replace(/\{schema\}/g, schema);
}

export default async function installDynamic(app) {
  const router = Router();
  
  logger.info('Starting dynamic route installation');
  
  // Ensure queries directories exist
  const directories = [SELECTS_DIR, INSERTS_DIR];
  for (const dir of directories) {
  try {
      await fs.mkdir(dir, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') {throw err;}
  }
  }

  // Load SQL files from both directories
  const selectFiles = await fs.readdir(SELECTS_DIR);
  const insertFiles = await fs.readdir(INSERTS_DIR);
  const updateFiles = await fs.readdir(UPDATES_DIR);
  const deleteFiles = await fs.readdir(DELETES_DIR);
  
  logger.info({ 
    selectFiles: selectFiles.length, 
    insertFiles: insertFiles.length,
    updateFiles: updateFiles.length,
    deleteFiles: deleteFiles.length
  }, 'Loaded SQL files from directories');

  // Use Postgres client directly
  const dbClient = pgClient;

  // Create GET routes for select queries
  for (const file of selectFiles) {
    if (!file.endsWith('.sql')) {continue;}

    const routePath = `/api/${path.basename(file, '.sql')}`;
    logger.info({ routePath }, 'Setting up SELECT route');
    const sqlTemplate = await fs.readFile(path.join(SELECTS_DIR, file), 'utf8');
    const sqlContent = replaceSqlPlaceholders(sqlTemplate);

    // GET endpoint
    router.get(routePath, async (req, res) => {
      logger.info('GET request received', { route: routePath, query: req.query });
      try {
        // Convert req.query to parameterized values for pg
        // (If your dbClient expects named params, pass req.query; if positional, adjust as needed)
        const result = await dbClient.query(sqlContent, req.query);
        if (!result || result.length === 0) {
          logger.info('Query returned no results', { route: routePath });
          return res.json([]);
        }
        logger.info('Query executed successfully', { route: routePath, rowCount: result.length });
        return res.json(result);
      } catch (err) {
        logger.error('Query error', { err, route: routePath });
        return res.status(500).json({ 
          error: 'Query execution failed',
          message: err.message,
          details: err.response ? err.response : undefined,
          sql: sqlContent
        });
      }
    });
  }

  // Create POST routes for insert queries
  for (const file of insertFiles) {
    if (!file.endsWith('.sql')) {continue;}

    const routePath = `/api/${path.basename(file, '.sql')}`;
    logger.info({ routePath }, 'Setting up INSERT route');

    // POST endpoint for inserts (handles both single and multiple rows)
    router.post(routePath, async (req, res) => {
      logger.info('POST request received', { route: routePath, body: req.body, userEmail: req.userEmail });
      
      // Normalize input to array format
      const { rows: bodyRows } = req.body;
      let rows;
      if (Array.isArray(bodyRows)) {
        rows = bodyRows;
      } else if (bodyRows) {
        rows = [bodyRows];
      } else if (Array.isArray(req.body)) {
        rows = req.body;
      } else {
        rows = [req.body];
      }
      
      logger.info({ route: routePath, rowCount: rows.length }, 'Starting INSERT operation');
      
      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ error: 'No row data provided' });
      }
      
      const client = dbClient;
      try {
        const jobId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        logger.info(`${req.userEmail} executing INSERT operation`, { jobId, userEmail: req.userEmail, operation: 'INSERT', rowCount: rows.length });
        
        // Load the INSERT template (stored procedure)
        const batchSqlPath = path.join(INSERTS_DIR, file);
        const batchSqlRaw = await fs.readFile(batchSqlPath, 'utf8');
        const batchSqlTemplate = replaceSqlPlaceholders(batchSqlRaw);
        
        // Build parameters for stored procedure
        const batchParams = {
          rows_json: JSON.stringify(rows),
          modified_by: req.userEmail
        };
        
        // Pass parameters directly to the query - the client's processParameters will handle
        // converting ${paramName} to $1, $2, etc. safely (prevents SQL injection)
        logger.info('Executing INSERT with parameterized query', { route: routePath, params: Object.keys(batchParams) });
        await client.query(batchSqlTemplate, batchParams);
        
        logger.info('INSERT completed', { route: routePath, jobId, rowCount: rows.length });
        return res.json({ status: 'success', jobId, rowCount: rows.length, timestamp: new Date().toISOString() });
      } catch (err) {
        logger.error('INSERT error', { err, route: routePath });
        let errorMsg;
        if (err.message?.includes('CAST_INVALID_INPUT')) {
          errorMsg = 'Invalid data format - check numeric and date fields';
        } else if (err.message?.includes('DELTA_CONCURRENT_APPEND')) {
          errorMsg = 'Concurrent modification detected - please try again';
        } else {
          errorMsg = err.message || 'Insert operation failed';
        }
        return res.status(500).json({ error: errorMsg });
      }
    });
  }

  // Create PUT routes for update queries
  for (const file of updateFiles) {
    if (!file.endsWith('.sql')) {continue;}

    const routePath = `/api/${path.basename(file, '.sql')}`;
    logger.info({ routePath }, 'Setting up UPDATE route');

    // PUT endpoint for updates (handles both single and multiple rows)
    router.put(routePath, async (req, res) => {
      logger.info('PUT request received', { route: routePath, body: req.body, userEmail: req.userEmail });
      
      // Normalize input to array format
      const { rows: bodyRows } = req.body;
      let rows;
      if (Array.isArray(bodyRows)) {
        rows = bodyRows;
      } else if (bodyRows) {
        rows = [bodyRows];
      } else if (Array.isArray(req.body)) {
        rows = req.body;
      } else {
        rows = [req.body];
      }
      
      logger.info({ route: routePath, rowCount: rows.length }, 'Starting UPDATE operation');
      
      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ error: 'No row data provided' });
      }
      
      const client = dbClient;
      try {
        const jobId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        logger.info(`${req.userEmail} executing UPDATE operation`, { jobId, userEmail: req.userEmail, operation: 'UPDATE', rowCount: rows.length });
        
        // Load the UPDATE template (stored procedure)
        const batchUpdatePath = path.join(UPDATES_DIR, file);
        const batchSqlRaw = await fs.readFile(batchUpdatePath, 'utf8');
        const batchSqlTemplate = replaceSqlPlaceholders(batchSqlRaw);
        
        // Build parameters for stored procedure
        const batchParams = {
          rows_json: JSON.stringify(rows),
          modified_by: req.userEmail
        };
        
        // Pass parameters directly to the query - the client's processParameters will handle
        // converting ${paramName} to $1, $2, etc. safely (prevents SQL injection)
        logger.info('Executing UPDATE with parameterized query', { route: routePath, params: Object.keys(batchParams) });
        await client.query(batchSqlTemplate, batchParams);
        
        logger.info('UPDATE completed', { route: routePath, jobId, rowCount: rows.length });
        return res.json({ status: 'success', jobId, rowCount: rows.length, timestamp: new Date().toISOString() });
      } catch (err) {
        logger.error('UPDATE error', { err, route: routePath });
        let errorMsg;
        if (err.message?.includes('CAST_INVALID_INPUT')) {
          errorMsg = 'Invalid data format - check numeric and date fields';
        } else {
          errorMsg = err.message || 'Update operation failed';
        }
        return res.status(500).json({ error: errorMsg });
      }
    });
  }

  // Create DELETE routes for delete queries
  for (const file of deleteFiles) {
    if (!file.endsWith('.sql')) {continue;}

    const routePath = `/api/${path.basename(file, '.sql')}`;
    logger.info({ routePath }, 'Setting up DELETE route');
    const sqlTemplate = await fs.readFile(path.join(DELETES_DIR, file), 'utf8');
    const sqlContent = replaceSqlPlaceholders(sqlTemplate);

    // DELETE endpoint for deletes
    router.delete(routePath, async (req, res) => {
      logger.info('DELETE request received', { route: routePath, body: req.body, userEmail: req.userEmail });
      logger.info({ route: routePath, body: req.body }, 'Starting DELETE transaction');
      
      try {
        const jobId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        logger.info(`${req.userEmail} executing DELETE operation`, { jobId, userEmail: req.userEmail, operation: 'DELETE' });
        
        // Execute directly to Databricks
        await dbClient.query(sqlContent, Object.values(req.body));
        // Broadcast data change to all connected clients
        const tableName = path.basename(file, '.sql');
        logger.info(`Broadcasting DELETE to table '${tableName}'`, { table: tableName, userEmail: req.userEmail });
        logger.info('DELETE completed', { route: routePath, jobId });
        return res.json({ status: 'success', jobId, timestamp: new Date().toISOString() });
      } catch (err) {
        logger.error('DELETE error', { err, route: routePath });
        let errorMsg;
        if (err.message?.includes('CAST_INVALID_INPUT')) {
          errorMsg = 'Invalid data format - check numeric and date fields';
        } else if (err.message?.includes('DELTA_CONCURRENT_APPEND')) {
          errorMsg = 'Concurrent modification detected - please try again';
        } else {
          errorMsg = err.message || 'Update operation failed';
        }
        return res.status(500).json({ error: errorMsg });
      }
    });
  }

  // Debug endpoint to view system state
  router.get('/api/debug/system-state', async (req, res) => {
    logger.info('Debug: Inspecting system state');
    try {
      const debugDbClient = dbClient;
      const connectionStatus = debugDbClient.getConnectionStatus();
      const stateStats = memoryState.getStats();
      res.json({
        timestamp: new Date().toISOString(),
        database: connectionStatus,
        state: stateStats
      });
    } catch (err) {
      logger.error('Failed to get system state', { err });
      res.status(500).json({ error: 'Failed to get system state', message: err.message });
    }
  });

  // User info endpoint
  router.get('/api/user/me', (req, res) => {
    logger.info('Debug: Fetching user info');
    res.json({
      email: req.userEmail,
      authenticated: !!req.userEmail,
      timestamp: new Date().toISOString()
    });
  });

  app.use(router);
}
