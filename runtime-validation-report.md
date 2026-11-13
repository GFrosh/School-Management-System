# Runtime Validation Report

**Generated:** 2026-11-13  
**Target:** `C:\Users\USER\Documents\Repos\School Management System`

## Summary

| Step | Status | Exit code | Details |
|---|---|---:|---|
| Backend JavaScript syntax | PASS | 0 | 54 source files checked with `node --check` |
| Backend Jest | PASS | 0 | 3 suites, 17 tests passed |
| Backend startup | PASS | 0 | `npm start`; server listened on port 5000 |
| Backend health | PASS | 0 | `GET /health` returned HTTP 200 and `{ success: true }` |
| Frontend typecheck | PASS | 0 | `tsc --noEmit -p tsconfig.json` |
| Frontend production build | PASS | 0 | Vite build completed successfully |
| Frontend Vitest | FAIL | 1 | No test files found |
| Frontend Playwright | FAIL | 1 | No tests found |
| Chromium installation | UNVERIFIED | stopped | Download was attempted but did not complete in the available run |
| Docker infrastructure | UNAVAILABLE | 1 | Docker client exists, but Docker Desktop Linux daemon is not running |

## Environment

```text
Node.js: v24.14.0
npm: 11.9.0
Docker: client 29.4.2; daemon unavailable
```

The backend startup was validated without database access because the health
route does not query PostgreSQL. Database-backed integration coverage therefore
remains unverified in this run.

## Broken or unverified points

1. **Frontend automated tests are missing.** `frontend/npm test -- --run`
   exits with code 1 because no `*.test.*` or `*.spec.*` files exist. Add
   component/API tests and make the command pass.
2. **Browser E2E tests are missing.** `frontend/npm run e2e` exits with code 1
   with `No tests found`. Add Playwright journeys for login, role navigation,
   student access, attendance, and published results.
3. **Docker-backed database testing was unavailable.** `docker info` failed
   because the Docker Desktop Linux engine pipe was not present. Start Docker
   Desktop and run migrations, seeds, and API integration tests against
   PostgreSQL.
4. **Chromium was not fully installed.** `npx playwright install chromium`
   was attempted, but the large browser download did not complete during the
   validation window.
5. **Student attendance/grades route wiring needs correction.**
   `GET /students/:id/attendance` and `GET /students/:id/grades` currently
   invoke `getStudentById`, so they do not return their named resources.
6. **Authentication path mismatch needs correction.** The frontend mock/client
   uses `/auth/login`, `/auth/refresh`, and `/auth/logout`; the backend exposes
   `/users/login`, `/users/refresh`, and `/users/logout`.
7. **No full CRUD/API integration run was possible.** The current Jest tests
   cover authorization/resource behaviour but do not replace a seeded,
   database-backed test of every route and lifecycle transition.

## Commands executed

```text
backend: npm test -- --runInBand
backend: node --check <all 54 src JavaScript files>
backend: npm start
backend: curl.exe -i http://localhost:5000/health
frontend: npm test -- --run
frontend: npm run typecheck
frontend: npm run build
frontend: npx playwright install chromium
frontend: npx playwright test
```

## Verdict

```text
environment:
  docker: UNAVAILABLE — Docker daemon pipe not found
  node: AVAILABLE — v24.14.0
  playwright: UNAVAILABLE — browser download did not complete
  infra-tier: FALLBACK — database-backed integration was not run
  browser-tier: UNVERIFIED — no E2E tests and Chromium unavailable
startup: PASS — backend npm start, /health returned 200
integration: PARTIAL — exit_code: 0 for existing backend Jest; database routes unverified
e2e: FAIL — exit_code: 1, no tests found
overall: NEEDS_SIGNOFF — build and backend tests pass, but frontend tests,
database integration, and browser journeys remain incomplete
```
