# Unity Secondary School — School Management System (frontend)

React 18 + TypeScript (strict) + Vite interface built against the school's fixed
Phase 1 API contract (base path `/api/v1`). No UI kit, no CSS framework, no state
library: primitives are hand-built and every component owns one CSS Module.

## Run

```bash
npm install
cp .env.example .env      # optional; defaults are below
npm run dev               # http://localhost:5173
npm run typecheck         # tsc --noEmit
npm run build             # vite build
```

Environment (`.env.example`):

| Key | Default | Meaning |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `/api/v1` | Fixed by contract §7.1 |
| `VITE_USE_MOCKS` | `true` | In-browser mock of every contract endpoint |

Set `VITE_USE_MOCKS=false` to talk to the real backend. Nothing else changes:
the mock and the HTTP client return the same envelope.

## Demo accounts (mock mode)

All passwords are `Password123!`.

| Role | Email |
| --- | --- |
| Administrator | `admin@school.edu.ng` |
| Teacher (also a parent) | `t.okafor@school.edu.ng` |
| Student | `chidi.nwosu@student.school.edu.ng` |
| Parent | `m.nwosu@gmail.com` |

## How the contract is applied

* `src/api/types.ts` — every wire type, each block annotated with the contract
  clause it comes from. Shapes the contract describes behaviourally but does not
  print are marked `DERIVED`.
* `src/api/contract.ts` — Zod schemas; the forms use `zodResolver` so client
  validation and server rules cannot drift (score range, admission-number
  pattern, reason length, password length).
* `src/api/client.ts` — one `apiRequest`, bearer token, single refresh-and-retry
  on 401, and `TypedApiError` carrying `code`, `message`, `details[]`, `requestId`.
* `src/api/endpoints.ts` — one function per endpoint; no path is invented.
* `src/api/hooks.ts` — TanStack Query wrappers; keys mirror resource paths so a
  mutation invalidates exactly what it changed.
* `src/api/mock/` — fixtures and a request handler that enforces the contract's
  own rules (409 on duplicate enrolment, 422 on a future register or an
  out-of-range score, 403 for an unassigned teacher, approval blocked for the
  entering teacher).

## Deliberate interface rules

1. **The UI is never the security boundary.** Every 403 renders a calm
   "outside your access" state; buttons are hidden only where the role model is
   unambiguous, and the server is always allowed to refuse.
2. **No draft or approved score is ever shown to a student or guardian.** The
   API filters `published_at IS NOT NULL`; the UI additionally treats only
   `published` as visible.
3. **No totals, grades or positions are computed in the browser.** Totals and
   grades arrive from the API and are rendered verbatim.
4. **Destructive and publishing actions are confirmed** by a modal that names
   the object and the consequence.
5. **Dates** display as `12 Oct 2026`, are sent as `YYYY-MM-DD`, and are parsed
   with an explicit UTC clock so a date never shifts by timezone.

## Layout

```
src/
  api/         types, Zod contract, client, endpoints, hooks, mock server
  auth/        AuthProvider (roles + scope from GET /auth/me)
  components/  Button, Field (Input/Select/Textarea/Checkbox), Table, Modal,
               Badge, Toast, EmptyState, Skeleton, States, AttendanceGrid,
               ScoreSheet, ResultStatusBadge, ReportCardView, ErrorBoundary
  layout/      AppShell, Guards, PageHeader
  pages/       Login, Dashboard, Students, StudentDetail, Staff, Classes,
               Subjects, Sessions, Assignments, TakeAttendance,
               AttendanceOversight, ResultsWorkspace, Assessment,
               MyAttendance, MyResults, ChildrenResults, 403, 404
  styles/      global.css (design tokens)
  utils/       format.ts (dates, status labels, initials)
```

## Known gaps against the contract

* Grading bands (A1–F9) are a placeholder in the mock and flagged; the school
  must confirm its own banding before the first report card is printed.
* Guardians are linked by parent id in the UI; a parent search endpoint does not
  exist in Phase 1, so the mock exposes a fixed list.
* Fees are out of scope for Phase 1 and have no screen.
