# Deployment guide

This project deploys as two services:

1. The Express API in `backend/`.
2. The Vite-built static frontend in `frontend/`.

PostgreSQL is required by the backend.

## 1. Provision PostgreSQL

Create a PostgreSQL database and user in the target environment. Record the
connection string without committing it:

```text
postgresql://<user>:<password>@<host>:5432/<database>
```

Enable network access only from the backend service. A managed PostgreSQL
service is recommended for production backups, patching, and monitoring.

## 2. Configure backend secrets

Create `backend/.env` from `backend/.env.example` and set at least:

```dotenv
NODE_ENV=production
PORT=5000
DB_URL=postgresql://...
JWT_ACCESS_SECRET=<unique-long-random-secret>
```

Review `backend/src/config/index.js` and `backend/knexfile.js` for any
environment-specific values. Keep the `.env` file outside source control.

## 3. Install and migrate the backend

On the deployment host or in the backend build step:

```bash
cd backend
npm ci --omit=dev
npx knex migrate:latest --env production
```

Run seeds only when initializing a new environment and after reviewing the seed
data:

```bash
npx knex seed:run --env production
```

Start the API with a process manager such as systemd, PM2, Azure App Service,
Container Apps, or Kubernetes:

```bash
npm start
```

Use `/health` for the process readiness probe.

## 4. Build and publish the frontend

Set the production API base URL before building:

```dotenv
VITE_API_BASE_URL=/api/v1
VITE_USE_MOCKS=false
```

Then build:

```bash
cd frontend
npm ci
npm run typecheck
npm run build
```

Publish `frontend/dist/` to a static web host, CDN, or web server. Configure
history fallback so client-side routes return `index.html`.

## 5. Configure routing and CORS

Recommended production routing:

```text
https://school.example/          -> frontend/dist
https://school.example/api/v1/* -> backend:5000/api/v1/*
https://school.example/health    -> backend:5000/health
```

If frontend and backend use different origins, update the backend CORS origin
from the development value in `backend/src/app.js` to the exact production
frontend origin and keep credentials enabled only when required.

Before production, align the frontend `/auth/*` calls with the backend
`/users/*` authentication routes or add an explicit compatibility route.

## 6. Smoke-test the deployment

```bash
curl -i https://school.example/health
curl -i https://school.example/
```

Then verify:

1. Login and refresh-token behaviour.
2. Admin access to users, sessions, classes, subjects, teachers, and results.
3. Teacher assignment and student scoping.
4. Attendance register save and submit.
5. Assessment score validation, approval, and publication.
6. Student/parent published-results privacy.
7. Browser refresh on nested frontend routes.

## 7. Operational checklist

- Enable HTTPS and secure cookies at the edge.
- Store secrets in a managed secret store.
- Configure PostgreSQL backups and a restore test.
- Configure application logs and alerting for 5xx responses.
- Use rolling or blue/green deployment for backend changes.
- Run migrations as a release step before switching traffic.
- Keep frontend and backend API contract versions compatible.
- Do not use development seed data in production.
