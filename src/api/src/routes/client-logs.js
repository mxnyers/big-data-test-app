import express from 'express';
import { logger } from '../config/logger.js';

const router = express.Router();

/**
 * POST /api/logs
 * Receive logs from frontend (browser) and write to backend stdout
 * This allows frontend logs to appear in docker-compose logs
 */
// eslint-disable-next-line consistent-return
router.post('/', (req, res) => {
  try {
    const { level, message, properties, timestamp } = req.body;

    // Validate required fields
    if (!level || !message) {
      return res.status(400).json({ error: 'Missing required fields: level, message' });
    }

    // Prepare log data with [FRONTEND] prefix for easy filtering
    const logData = {
      source: 'frontend',
      timestamp: timestamp || new Date().toISOString(),
      ...properties,
    };

    // Log to backend using appropriate level
    switch (level.toLowerCase()) {
      case 'error':
        logger.error(`[FRONTEND] ${message}`, logData);
        break;
      case 'warn':
        logger.warn(`[FRONTEND] ${message}`, logData);
        break;
      case 'debug':
        logger.debug(`[FRONTEND] ${message}`, logData);
        break;
      case 'info':
      default:
        logger.info(`[FRONTEND] ${message}`, logData);
        break;
    }

    // Return success
    res.status(204).send();
  } catch (error) {
    logger.error('Failed to process frontend log', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/logs/batch
 * Receive batch of logs from frontend for efficient transmission
 * Supports both fetch() and sendBeacon() requests
 */
// eslint-disable-next-line consistent-return
router.post('/batch', (req, res) => {
  try {
    // sendBeacon may send as text/plain, handle both formats
    let logs;
    if (typeof req.body === 'string') {
      const parsed = JSON.parse(req.body);
      ({ logs } = parsed);
    } else {
      ({ logs } = req.body);
    }

    if (!Array.isArray(logs)) {
      return res.status(400).json({ error: 'Expected array of logs' });
    }

    // Process each log entry
    logs.forEach(({ level, message, properties, timestamp }) => {
      if (!level || !message) {
        return; // Skip invalid entries
      }

      const logData = {
        source: 'frontend',
        timestamp: timestamp || new Date().toISOString(),
        ...properties,
      };

      switch (level.toLowerCase()) {
        case 'error':
          logger.error(`[FRONTEND] ${message}`, logData);
          break;
        case 'warn':
          logger.warn(`[FRONTEND] ${message}`, logData);
          break;
        case 'debug':
          logger.debug(`[FRONTEND] ${message}`, logData);
          break;
        case 'info':
        default:
          logger.info(`[FRONTEND] ${message}`, logData);
          break;
      }
    });

    res.status(204).send();
  } catch (error) {
    logger.error('Failed to process frontend log batch', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
