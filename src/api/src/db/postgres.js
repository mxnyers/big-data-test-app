import 'dotenv/config';
import pkg from 'pg';
import logger from '../config/logger.js';
const { Pool } = pkg;

// Pool configuration - prefer DATABASE_URL, fall back to individual AWS/RDS env vars.
// Example psql you provided:
// psql -h nytech-poc-db.c7su6g02q0e9.us-west-1.rds.amazonaws.com -p 5432 -U postgres -d postgres
//
// Example env settings to match above:
// PGHOST=nytech-poc-db.c7su6g02q0e9.us-west-1.rds.amazonaws.com
// PGPORT=5432
// PGDATABASE=postgres
// PGUSER=postgres
// PGPASSWORD=<your-password>
// PGSSL=true       # set to "true" for RDS with TLS (will use rejectUnauthorized: false)
const poolOptions = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      max: parseInt(process.env.PG_POOL_MAX || '10', 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: parseInt(process.env.PG_CONNECTION_TIMEOUT_MS || '10000', 10),
    }
  : {
      host: process.env.PGHOST,
      port: Number(process.env.PGPORT || 5432),
      database: process.env.PGDATABASE,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
      max: parseInt(process.env.PG_POOL_MAX || '10', 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: parseInt(process.env.PG_CONNECTION_TIMEOUT_MS || '10000', 10),
    };

const pool = new Pool(poolOptions);

// Helper to transform named params ({name}) into $1, $2 ... and produce values array
function prepareSql(text, params) {
  let sql = text;
  let values = params;

  if (params && !Array.isArray(params) && typeof params === 'object') {
    const names = [];
    sql = String(text).replace(/\$?\{([a-zA-Z0-9_]+)\}/g, (m, name) => {
      let idx = names.indexOf(name);
      if (idx === -1) {
        names.push(name);
        idx = names.length - 1;
      }
      return `$${idx + 1}`;
    });
    values = names.map((n) => params[n]);
  }

  return { sql, values };
}

export const pgClient = {
  async connect() {
    // Verify connection by acquiring a client and releasing it
    const client = await pool.connect();
    client.release();
    return true;
  },

  // Simple query (uses pool.query) with named param support
  async query(text, params = []) {
    try {
      const { sql, values } = prepareSql(text, params);
      const res = await pool.query(sql, values);
      return res.rows;
    } catch (err) {
      logger.error({ err, text, params }, 'Postgres query failed');
      throw err;
    }
  },

  // Transactional query using a dedicated client (similar to your connection.js)
  // options: { modifiedBy, changeSource } -> sets local app variables for the transaction
  async queryTx(text, params = [], options = {}) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      if (options.modifiedBy) {
        await client.query('SET LOCAL app.current_user = $1', [options.modifiedBy]);
      }

      if (options.changeSource) {
        await client.query('SET LOCAL app.change_source = $1', [options.changeSource]);
      }

      const { sql, values } = prepareSql(text, params);
      const result = await client.query(sql, values);

      await client.query('COMMIT');
      return result.rows;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch (rbErr) {
        logger.error({ err: rbErr }, 'Rollback failed');
      }
      logger.error({ err: error, text, params, options }, 'Transactional Postgres query failed');
      throw error;
    } finally {
      client.release();
    }
  },

  // Helper for calling stored procedures (supports CALL or SELECT-based procs)
  async callProcedure(sql, params = []) {
    try {
      return await this.query(sql, params);
    } catch (err) {
      logger.error({ err, sql, params }, 'Stored procedure call failed');
      throw err;
    }
  }
};

// Helper to inspect pool status
pgClient.getConnectionStatus = function getConnectionStatus() {
  return {
    total: pool.totalCount || 0,
    idle: pool.idleCount || 0,
    waiting: pool.waitingCount || 0,
  };
};

export default pool;
