# Local Debug & Deploy Guide

This document explains how to run, debug and test the Bakehouse proof-of-concept application locally. It is written for Windows PowerShell (v5.1) and assumes Docker is available for the recommended workflow.

## Pre-flight checklist

- Open a PowerShell terminal in the repository root (this project uses `src/` as the working folder in this repo).
- Ensure Docker Desktop is installed and running.
- Verify `.env` (under `src/`) contains correct values if you want to connect to a real Databricks instance. For quick local testing you can leave Databricks variables empty and use the mock guidance below.
- Ports used by the compose stack:
  - Redis: 6379
  - API: 8080 (internal)
  - Web (nginx): 8081 (mapped)

## Run the whole stack with Docker Compose (recommended)

This builds the API and frontend images and launches Redis, API and frontend (nginx).

From the repo root run:

```powershell
cd .\src
docker-compose up --build
```

What to check:
- `docker-compose ps` to list containers and status
- `docker-compose logs -f api` to stream API logs
- `docker-compose logs -f web` to stream frontend/nginx logs

Open in a browser:
- Frontend: http://localhost:8081
- API health: use container-local check if API port is not host-mapped (see note below). You can run `docker-compose exec api curl http://localhost:8080/healthz`.

Note: By default the API service is `expose`d (internal) in `docker-compose.yml`. If you want to reach the API directly at `http://localhost:8080` from your host, add a `ports` mapping to the `api` service in `docker-compose.yml`.

## Run services locally without Docker (fast development loop)

If you want to develop and debug code in your editor, run Redis in Docker and run API and frontend locally.

Start Redis only (still using compose):

```powershell
cd .\src
docker-compose up -d redis
```

Start API locally:

```powershell
cd .\src\api
npm ci
# run normally
npm start
# or run with the Node inspector for debugging
node --inspect=9229 src/server.js
```

Start frontend locally (dev server):

```powershell
cd .\src\frontend
npm ci
# typical dev command (framework dependent)
npm run dev
# or
npm start
```

Notes:
- The frontend expects API requests under `/api/`. If you run the frontend dev server on a different port, configure the dev server proxy or set an environment variable such as `VITE_API_BASE` or `REACT_APP_API_BASE` so the frontend forwards requests to `http://localhost:8080` (API host).

## Exercise the dynamic routes (PowerShell examples)

Assuming the API is reachable at `http://localhost:8080` (adjust to `http://localhost:8081/api` if you go through nginx):

GET (read):

```powershell
Invoke-RestMethod -Method Get -Uri 'http://localhost:8080/api/sales_transactions' | ConvertTo-Json -Depth 5
```

POST (insert):

```powershell
$body = @{
  transactionID = 12345
  customerID = 987
  franchiseID = 12
  product = 'Blueberry Muffin'
  quantity = 2
  unitPrice = 350
  totalPrice = 700
  paymentMethod = 'card'
  cardNumber = '4242424242424242'
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri 'http://localhost:8080/api/sales_transactions' -Body $body -ContentType 'application/json'
```

PUT (update):

```powershell
$body = @{ transactionID = 12345; quantity = 3 } | ConvertTo-Json
Invoke-RestMethod -Method Put -Uri 'http://localhost:8080/api/sales_transactions' -Body $body -ContentType 'application/json'
```

DELETE:

```powershell
$body = @{ transactionID = 12345 } | ConvertTo-Json
Invoke-RestMethod -Method Delete -Uri 'http://localhost:8080/api/sales_transactions' -Body $body -ContentType 'application/json'
```

If using nginx-proxied frontend, substitute `http://localhost:8081/api/...` for the URIs above.

## Inspect Redis (write queue & cache)

With docker-compose running you can inspect Redis using the redis-cli in the container:

```powershell
cd .\src
# list pending writes
docker-compose exec redis redis-cli LRANGE write_queue 0 -1
# list keys
docker-compose exec redis redis-cli KEYS 'write:*'
# view a cached GET response (example key)
docker-compose exec redis redis-cli GET 'GET:/api/sales_transactions'
```

## Stream API logs & common failures

Stream API logs:

```powershell
cd .\src
docker-compose logs -f api
```

Common problems to look for:
- Databricks authentication errors (missing/invalid env vars). If you don't have credentials expect query failures.
- Redis connection refused — verify `REDIS_URL` and that redis container is healthy.
- SQL files not found — ensure SQL files are placed under `src/api/src/queries/{selects,inserts,updates,deletes}`.
- Parameter placeholder mismatch — SQL files use `${param}` placeholders; verify the Databricks client you use supports this binding method or adjust accordingly.

## Debugging in VS Code

Attach to Node (API):

1. Start the API with the inspector:

```powershell
node --inspect=9229 src/server.js
```

2. Use this `launch.json` snippet to attach:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "attach",
      "name": "Attach to API",
      "port": 9229,
      "restart": true,
      "protocol": "inspector",
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

Debug the frontend:
- Start the frontend dev server (`npm run dev` or `npm start`) and use browser devtools for breakpoints.
- If you prefer IDE debugging, use the Chrome/Edge debug extension and attach to the dev server URL.

## Quick verification checklist

- [ ] `docker-compose up --build` completes and containers are running.
- [ ] `docker-compose exec api curl http://localhost:8080/healthz` returns `{ ok: true }` (or `curl` via host if port-mapped).
- [ ] `GET /api/<route>` returns JSON or informative error.
- [ ] `POST /api/<insert-route>` returns `{"status":"queued"}` and `LRANGE write_queue` shows a pending write.
- [ ] API logs show no Redis/Databricks connection errors.

## Recommended improvements (next steps)

- Background write worker: move write processing out of request handlers and into a dedicated background worker that polls the Redis `write_queue` every N seconds. This decouples writes and improves reliability.
- `MOCK_DB` dev mode: add a mock mode for the Databricks client to return stubbed data so you can develop frontend and flow without Databricks credentials.
- Add integration tests or a small script that runs through the GET -> POST -> check queue -> process -> verify flow for one entity.
- Add a `docker-compose.override.yml` for development which maps API port to host and mounts source volumes for live code edits.

## Where to look in this repo

- API server: `src/api/src` (server, routes, cache, db)
- Query files loaded dynamically from: `src/api/src/queries/{selects,inserts,updates,deletes}`
- Frontend app: `src/frontend/src` (React app and `components/DynamicTable.jsx`)
- Docker compose: `src/docker-compose.yml`

---

## Quick Service Access Guide

### Frontend Web App
- Main interface: http://localhost:8081
- This is your primary entry point for viewing and interacting with the data

### API Access
The API can be accessed in two ways:
1. **Through Frontend (Recommended)**
   - Base URL: http://localhost:8081/api/<endpoint>
   - All API calls are proxied through the frontend's nginx server

2. **Available Endpoints**
   - GET requests (Read Data):
     ```
     /api/sales_customers
     /api/sales_transactions
     /api/sales_franchises
     /api/sales_suppliers
     /api/media_customer_reviews
     /api/media_gold_reviews_chunked
     ```
   - POST requests (Insert Data):
     ```bash
     # Example POST request
     curl -X POST http://localhost:8081/api/sales_transactions \
       -H "Content-Type: application/json" \
       -d '{"field1":"value","field2":123}'
     ```
   - Similar patterns for PUT (updates) and DELETE operations

### Redis Cache
- Port: 6379 (default Redis port)
- Access via redis-cli:
  ```powershell
  redis-cli -h localhost -p 6379 ping
  ```
- Or through Docker:
  ```powershell
  docker compose exec redis redis-cli ping
  ```

### Useful Docker Commands
Monitor and manage your containers:
```powershell
# View running containers
docker compose ps

# View logs (all services)
docker compose logs -f

# View specific service logs
docker compose logs -f api
docker compose logs -f web
docker compose logs -f redis

# Shell into containers
docker compose exec api sh
docker compose exec redis sh

# Rebuild and restart
docker compose up --build -d
```

### Health Checks
- Frontend: http://localhost:8081
- API Health: http://localhost:8081/api/healthz
- Redis: Use `redis-cli ping` as shown above