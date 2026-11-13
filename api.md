# API reference

Base URL: `http://localhost:5000/api/v1`

Responses use the envelope:

```json
{ "success": true, "data": {}, "meta": null }
```

Errors include `success: false`, an error `code`, a message, and the
`X-Request-Id` response header. Protected routes use the access token accepted
by the authentication middleware and require the role listed below.

## Health

| Method | Path | Access |
|---|---|---|
| GET | `/health` | Public; outside `/api/v1` |
| GET | `/` | Public; outside `/api/v1` |

## Users and authentication

| Method | Path | Access |
|---|---|---|
| POST | `/users/login` | Public |
| POST | `/users/refresh` | Refresh-token authentication |
| POST | `/users/logout` | Refresh-token authentication |
| GET | `/users/me` | Authenticated |
| POST | `/users/logout/all` | Authenticated |
| POST | `/users/password` | Authenticated |
| GET | `/users` | Admin |
| PATCH | `/users/:id/status` | Admin |

## Students and enrolments

| Method | Path | Access |
|---|---|---|
| GET | `/students` | Admin, teacher; teachers are scoped |
| POST | `/students` | Admin |
| GET | `/students/:id` | Admin, teacher |
| PATCH | `/students/:id` | Admin |
| GET | `/students/:id/enrolments` | Admin, teacher |
| POST | `/students/:id/enrolments` | Admin |
| PATCH | `/students/:id/enrolments/:enrolmentId` | Admin |
| PATCH | `/students/:id/enrolments/:enrolmentId/close` | Admin |

## Sessions, terms, classes, and subjects

| Method | Path | Access |
|---|---|---|
| GET | `/sessions` | Authenticated |
| POST | `/sessions` | Admin |
| PATCH | `/sessions/:id` | Admin |
| GET | `/sessions/:id/terms` | Authenticated |
| POST | `/sessions/:id/terms` | Admin |
| GET | `/sessions/:id/promotions` | Admin |
| POST | `/sessions/:id/promotions` | Admin |
| GET | `/classes` | Authenticated; teachers are scoped |
| POST | `/classes` | Admin |
| PATCH | `/classes/:id` | Admin |
| GET | `/subjects` | Authenticated |
| POST | `/subjects` | Admin |
| DELETE | `/subjects/:id` | Admin |

## Teachers and assignments

| Method | Path | Access |
|---|---|---|
| GET | `/teachers` | Admin |
| POST | `/teachers` | Admin |
| PATCH | `/teachers/:id` | Admin |
| GET | `/teaching-assignments` | Admin, teacher |
| POST | `/teaching-assignments` | Admin |
| DELETE | `/teaching-assignments/:id` | Admin |
| GET | `/teaching-assignments/:assignmentId/roster` | Admin, teacher |

Assignments are returned with nested `teacher`, `class`, `subject`, and `term`
objects. A teacher can only access assignments and rosters within their scope.

## Guardians

| Method | Path | Access |
|---|---|---|
| GET | `/students/:id/guardians` | Admin |
| POST | `/students/:id/guardians` | Admin |
| DELETE | `/students/:id/guardians/:parentId` | Admin |

## Attendance

| Method | Path | Access |
|---|---|---|
| GET | `/attendance-registers` | Admin, teacher |
| PUT | `/attendance-registers` | Admin, teacher |
| POST | `/attendance-registers/:id/submit` | Admin, teacher |
| GET | `/students/:id/attendance` | Authenticated |

Attendance dates cannot be in the future. Registers are scoped to a teaching
assignment and its session.

## Assessments, scores, and results

| Method | Path | Access |
|---|---|---|
| GET | `/assessments` | Admin, teacher |
| POST | `/assessments` | Admin |
| GET | `/assessments/:id/scores` | Admin, teacher |
| PUT | `/assessments/:id/scores` | Admin, teacher |
| POST | `/assessments/:id/submit` | Admin, teacher |
| POST | `/assessments/:id/approve` | Admin |
| POST | `/assessments/:id/publish` | Admin |
| POST | `/results/:id/corrections` | Admin, teacher |
| POST | `/results/:id/corrections/:correctionId/approve` | Admin |
| GET | `/enrolments/:id/report-card` | Authenticated, scoped |
| GET | `/me/results` | Student, parent |

Scores cannot exceed the assessment maximum. The teacher who entered a result
cannot approve that result. Students and parents only receive published
results.

## Response conventions

- Database field names are generally returned in `snake_case`.
- Dates are ISO timestamps or ISO dates as defined by each resource.
- `is_core` identifies Core versus Elective subjects.
- Authorization failures use HTTP 401 or 403; missing resources use HTTP 404;
  validation and business-rule failures use HTTP 422 or 409.

## Known route issues requiring follow-up

These are not hidden by the documentation:

1. `GET /students/:id/attendance` and `GET /students/:id/grades` are currently
   wired to the student-detail controller rather than dedicated attendance and
   grades handlers. The attendance API above is implemented through the
   academic route; the duplicate student routes should be corrected or removed.
2. The frontend client/mock uses `/auth/*` paths for login and refresh, while
   the Express backend currently mounts those handlers at `/users/*`. Align the
   client and backend before disabling frontend mocks.
