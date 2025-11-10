import { DBSQLClient } from '@databricks/sql';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

export class DatabricksClient {
  constructor() {
    this.client = new DBSQLClient();
  }

  async connect() {
    await this.client.connect({
      host: process.env.DATABRICKS_SERVER_HOSTNAME,
      path: process.env.DATABRICKS_HTTP_PATH,
      token: process.env.DATABRICKS_TOKEN
    });
    logger.info('Connected to Databricks');
  }

  async query(sql, params = []) {
    let session;
    try {
      session = await this.client.openSession();
      const statement = await session.executeStatement(sql, params);
      const result = await statement.fetchAll();
      await statement.close();
      return result;
    } catch (err) {
      logger.error({ 
        error: err.message,
        sql,
        params,
        response: err.response,
        statusCode: err.statusCode
      }, 'Databricks query failed');
      throw err;
    } finally {
      if (session) {
        await session.close();
      }
    }
  }

  // Process writes from the cache queue
  async processWrites(writes) {
    const session = await this.client.openSession();
    try {
      for (const write of writes) {
        const { sql, params } = write.value;
        const statement = await session.executeStatement(sql, params);
        await statement.close();
      }
    } finally {
      await session.close();
    }
  }
}

export const databricksClient = new DatabricksClient();
