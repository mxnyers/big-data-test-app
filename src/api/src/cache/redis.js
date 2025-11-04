import { createClient } from 'redis';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const CACHE_TTL = 300; // 5 minutes default TTL

export class RedisCache {
  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL
    });

    this.client.on('error', err => logger.error({ err }, 'Redis error'));
    this.client.on('connect', () => logger.info('Redis connected'));
  }

  async connect() {
    await this.client.connect();
  }

  async get(key) {
    const value = await this.client.get(key);
    return value ? JSON.parse(value) : null;
  }

  async set(key, value, ttl = CACHE_TTL) {
    await this.client.set(key, JSON.stringify(value), { EX: ttl });
  }

  // Queue a write operation to be processed later
  async queueWrite(key, value) {
    const writeQueue = await this.client.lPush('write_queue', JSON.stringify({ key, value }));
    // Immediately set in cache for read overlay
    await this.set(key, value);
    return writeQueue;
  }

  // Get all pending writes
  async getPendingWrites() {
    const writes = await this.client.lRange('write_queue', 0, -1);
    return writes.map(write => JSON.parse(write));
  }

  // Remove a write from the queue after it's processed
  async removeWrite(index) {
    await this.client.lRem('write_queue', 1, index);
  }
}

export const redisCache = new RedisCache();
