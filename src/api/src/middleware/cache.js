import { redisCache } from '../cache/redis.js';

export const cacheMiddleware = (ttl = 300) => async (req, res, next) => {
  const cacheKey = `${req.method}:${req.originalUrl}`;
  
  try {
    // Check cache first
    const cachedData = await redisCache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    // Store original res.json to intercept response
    const originalJson = res.json.bind(res);
    res.json = async (data) => {
      try {
        await redisCache.set(cacheKey, data, ttl);
      } catch (err) {
        req.log.error({ err }, 'Cache set error');
      }
      return originalJson(data);
    };

    next();
  } catch (err) {
    req.log.error({ err }, 'Cache middleware error');
    next();
  }
};
