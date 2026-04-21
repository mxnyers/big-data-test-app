import pkg from 'pg';
import logger from '../config/logger.js';
const { Pool } = pkg;

// Pool configuration - for AWS RDS use the connection string or individual env vars
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // e.g. postgres://user:pass@host:5432/db
  max: parseInt(process.env.PG_POOL_MAX || '10', 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

export const pgClient = {
  async connect() {
    // Verify connection by acquiring a client and releasing it
    const client = await pool.connect();
    client.release();
    return true;
  },

  // Support named params in SQL using ${name} -> $1 style substitution
  async query(text, params = []) {
    try {
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

      const res = await pool.query(sql, values);
      return res.rows;
    } catch (err) {
      logger.error({ err, text, params }, 'Postgres query failed');
      throw err;
    }
  },

  // Helper for calling stored procedures (supports CALL or SELECT-based procs)
  async callProcedure(sql, params = []) {
    // Example usage: callProcedure('CALL my_proc($1,$2)', [val1, val2])
    try {
      // Reuse query() to benefit from named param handling
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
