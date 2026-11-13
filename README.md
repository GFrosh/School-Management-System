# School Management System

School administration system with a React frontend and an Express/PostgreSQL
backend. The application covers authentication, students, sessions, terms,
classes, subjects, teacher assignments, enrolments, attendance, assessments,
results, guardians, and promotions.

## Repository layout

```text
backend/       Express API, Knex migrations/seeds, Jest tests
frontend/      React 18 + TypeScript + Vite application
api.md         HTTP API reference
deployment.md  Local and production deployment procedure
runtime-validation-report.md
```

The backend package was intentionally flattened into `backend/`; the obsolete
`backend/server/` directory no longer exists.

## Requirements

- Node.js 20 or newer
- npm
- PostgreSQL 14 or newer
- A browser for local frontend development
- Docker Desktop is optional, but useful for running PostgreSQL consistently

## Quick start

### Backend

```powershell
cd backend
npm install
Copy-Item .env.example .env
# Set DATABASE_URL or the local PostgreSQL variables in .env.
npm run migrate
npm run seed
npm start
```

The API listens on `http://localhost:5000`. Verify it with:

```powershell
curl.exe http://localhost:5000/health
```

### Frontend

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

The Vite development server listens on `http://localhost:5173`.
Set `VITE_USE_MOCKS=false` when the frontend should call the backend instead of
the in-browser mock API. The frontend expects the API under `/api/v1`; configure
the Vite development proxy or a reverse proxy accordingly.

## Verification commands

```powershell
cd backend
npm test -- --runInBand

cd ..\frontend
npm run typecheck
npm run build
npm test -- --run
npm run e2e
```

The current validation state, including unavailable infrastructure and missing
frontend test files, is recorded in
[runtime-validation-report.md](./runtime-validation-report.md).

## Documentation

- [API reference](./api.md)
- [Deployment guide](./deployment.md)
- [Frontend documentation](./frontend/README.md)
- [Database schema diagram](./backend/docs/dbSchema.mmd)

## Security notes

- Never commit `.env` files or production secrets.
- Use a unique, long random `JWT_ACCESS_SECRET` in every deployed environment.
- Restrict CORS to the deployed frontend origin.
- Run migrations before seeding and do not run development seeds against a
  production database without reviewing them.
- Put the API behind HTTPS and a reverse proxy in production.
