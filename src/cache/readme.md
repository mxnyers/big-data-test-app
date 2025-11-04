Caching layer (Redis)

This folder contains the Redis configuration and notes for how caching and write-queueing are handled by the API service.

What it contains
- `redis/redis.conf` — Redis server configuration used by the Docker Compose service (memory limits, eviction policy, etc.).

Behavior and responsibilities
- Read cache: the API `cacheMiddleware` looks for cached GET responses under a key pattern like `GET:/api/<route>` and returns cached JSON when present.
- Write queue: write operations (POST/PUT/DELETE) are enqueued into a Redis list (e.g. `write_queue`) as JSON objects. This decouples request handling from database writes and lets a separate worker or periodic processor flush writes to Databricks.
- Overlay behavior: when queuing a write the API may also update the in-memory cache so reads reflect the most current (queued) state until the write is persisted.

Developer notes
- Use `docker-compose exec redis redis-cli` to inspect the queue and cache keys during development. Example commands:
	- `LRANGE write_queue 0 -1` — show pending writes
	- `KEYS 'write:*'` — list write keys (if used)
	- `GET 'GET:/api/sales_transactions'` — inspect a cached GET response

Next steps
- Consider running a background worker process (separate container/task) that polls the Redis `write_queue` and performs writes to Databricks. This is more robust and easier to scale than processing the queue inline inside request handlers.

