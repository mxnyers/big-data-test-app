# API Service

This folder contains the Node/Express API that exposes dynamic routes generated from SQL query files. The project has deprecated the previous Redis-based cache/write-queue and Databricks runtime in favor of a Postgres-backed implementation and a no-op cache layer.

Key files and folders
- `src/server.js` — Express server bootstrap (middleware: helmet, compression, JSON body parser, pino logging). It calls the dynamic route installer.
- `src/routes/dynamic.js` — Scans `src/queries/{selects,inserts,updates,deletes}` and automatically creates REST endpoints:
	- `GET /api/<name>` -> runs the SELECT SQL and responds (with cache overlay)
	- `POST /api/<name>` -> queues an INSERT write (returns queued immediately)
	- `PUT /api/<name>` -> queues an UPDATE write
	- `DELETE /api/<name>` -> queues a DELETE write

- `src/db/postgres.js` — Postgres client wrapper (using `pg` Pool). Use `DATABASE_URL` env var to point at your AWS-managed Postgres instance. The dynamic router will execute SQL files against Postgres.
- `src/middleware/cache.js` — Cache middleware is now a no-op since Redis has been deprecated. Leaving the middleware in place avoids breaking imports but it does not perform caching.
- `src/queries/` — SQL files organized into subfolders: `selects/`, `inserts/`, `updates/`, `deletes/`. Adding a file to any of these directories automatically exposes a route with the same name (filename without `.sql`).

Behavior summary
On GET: the API runs the configured SELECT SQL against Postgres and returns results. The cache middleware is a no-op in the default configuration.

On POST/PUT/DELETE: the API executes the corresponding SQL (or stored procedure) against Postgres. For a production migration you may want to implement a durable write-queue or background worker pattern; the previous implementation used Redis for this decoupling and has been removed.

Notes for developers
- SQL files use `${param}` placeholders. Ensure the Databricks client binding code maps request body/query parameters correctly. For local development you can implement a `MOCK_DB` mode to return sample data without Databricks credentials.
- The dynamic router makes it easy to add/remove endpoints by simply adding/removing SQL files.

How to run
-- See project root `README.md` (local debug & deploy guide) for Docker Compose and local dev instructions.
