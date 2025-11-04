# API Service

This folder contains the Node/Express API that exposes dynamic routes generated from SQL query files and overlays a Redis cache and write-queue. The API is designed to be lightweight and easily autoscalable as a standalone container in Docker Compose.

Key files and folders
- `src/server.js` — Express server bootstrap (middleware: helmet, compression, JSON body parser, pino logging). It calls the dynamic route installer.
- `src/routes/dynamic.js` — Scans `src/queries/{selects,inserts,updates,deletes}` and automatically creates REST endpoints:
	- `GET /api/<name>` -> runs the SELECT SQL and responds (with cache overlay)
	- `POST /api/<name>` -> queues an INSERT write (returns queued immediately)
	- `PUT /api/<name>` -> queues an UPDATE write
	- `DELETE /api/<name>` -> queues a DELETE write

- `src/cache/redis.js` — Redis client wrapper used for caching GET results and for storing a `write_queue` list of pending write operations. Exposes helper methods for set/get and queue management.
- `src/middleware/cache.js` — Express middleware that checks Redis for cached GET responses and caches responses on miss.
- `src/db/databricks.js` — Databricks SQL client wrapper used to execute queries against the Databricks warehouse. The code is intentionally small so you can swap in a mocked implementation for local development.
- `src/queries/` — SQL files organized into subfolders: `selects/`, `inserts/`, `updates/`, `deletes/`. Adding a file to any of these directories automatically exposes a route with the same name (filename without `.sql`).

Behavior summary
- On GET: the cache middleware first checks Redis for `GET:/api/<name>`; if present it returns the cached JSON. On a cache miss the query runs against Databricks and the result is cached.
- On POST/PUT/DELETE: the API enqueues a write object into Redis (so writes are decoupled from request latency). A background worker or the inline processor will pick up queued writes and execute them against Databricks. After successful writes the related GET cache keys are invalidated.

Notes for developers
- SQL files use `${param}` placeholders. Ensure the Databricks client binding code maps request body/query parameters correctly. For local development you can implement a `MOCK_DB` mode to return sample data without Databricks credentials.
- The dynamic router makes it easy to add/remove endpoints by simply adding/removing SQL files.

How to run
- See project root `README.md` (local debug & deploy guide) for Docker Compose and local dev instructions.
