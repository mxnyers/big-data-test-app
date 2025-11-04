Frontend (React)

This folder contains the single-page React application and the `DynamicTable` component used to display data from the dynamic API routes. The app is built and served by an nginx image in the Dockerfile.

Key files and structure
- `src/App.jsx` — Main application shell. The example app mounts multiple `DynamicTable` instances pointing to the API routes (e.g. `sales_transactions`, `sales_customers`).
- `src/components/DynamicTable.jsx` — Reusable, div/table-like component that:
	- Fetches data from `/api/<endpoint>`
	- Dynamically derives columns from the result set
	- Renders rows and an editable input row for inserts
	- Supports Add (POST), and relies on backend routes for PUT/DELETE
- `src/components/DynamicTable.css` — Component styles.
- `nginx.conf` — nginx configuration used in the Dockerfile to serve static files and reverse-proxy `/api/` to the internal `api` service.
- `Dockerfile` — Builds the frontend and copies the output to the nginx image for production.

Developer notes
- The frontend expects API endpoints under `/api/` (nginx proxies `/api/` to the API service). When running the frontend dev server locally you may need to set an environment variable such as `VITE_API_BASE` or `REACT_APP_API_BASE` or configure a dev-server proxy so requests reach `http://localhost:8080`.
- `DynamicTable` auto-detects columns from the first row returned by the API. It appends an input row for inserts; submit triggers a `POST /api/<endpoint>`.

How to run locally (dev)
- Run the frontend dev server in `src/frontend` with `npm ci` and `npm run dev` (or `npm start` depending on the app scaffold you use).
- Make sure the API is reachable at the path configured by the dev server (see above) so the component can fetch `/api/<endpoint>`.
