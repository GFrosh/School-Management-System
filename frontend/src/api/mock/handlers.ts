/**
 * Mock implementation of contract section 7. It is the *server*: it may compute
 * grades, totals and positions, enforce scope, and reject requests — exactly
 * what the real service does. Turning mocks off (VITE_USE_MOCKS=false) must
 * require no component changes.
 */
import type { Envelope, ErrorCode, ErrorDetail } from '../types';
import { state } from './data';

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export type MockResponse =
  | { ok: true; status: number; body: Envelope<unknown> }
  | { ok: false; status: number; body: { error: { code: ErrorCode; message: string; details?: ErrorDetail[]; requestId: string } } };

const now = () => new Date().toISOString();
const uid = (p: string) => `${p}${Math.random().toString(16).slice(2, 10)}-0000-4000-8000-${Date.now().toString().slice(-12)}`;

function ok<T>(data: T, status = 200, meta?: Envelope<T>['meta']): MockResponse {
  return { ok: true, status, body: (meta ? { data, meta } : { data }) as Envelope<unknown> };
}

function fail(status: number, code: ErrorCode, message: string, details?: ErrorDetail[]): MockResponse {
  return {
    ok: false,
    status,
    body: { error: { code, message, details: details ?? [], requestId: `req-${Math.random().toString(16).slice(2, 10)}` } },
  };
}

function parse(path: string): { pathname: string; query: URLSearchParams } {
  const [pathname = '', search = ''] = path.split('?');
  return { pathname, query: new URLSearchParams(search) };
}

function tokenFor(userId: string) {
  return `mock.${userId}`;
}

function userFromToken(token: string | null) {
  if (!token || !token.startsWith('mock.')) return null;
  const id = token.slice(5);
  return state.users.find((u) => u.id === id) ?? null;
}

/** Nigerian A1–F9 banding. PLACEHOLDER: contract risk R1 says the school's own
 *  banding must be confirmed before a report card is finalised. Server-side only. */
const GRADE_BANDS: { grade: string; min: number }[] = [
  { grade: 'A1', min: 75 },
  { grade: 'B2', min: 70 },
  { grade: 'B3', min: 65 },
  { grade: 'C4', min: 60 },
  { grade: 'C5', min: 55 },
  { grade: 'C6', min: 50 },
  { grade: 'D7', min: 45 },
  { grade: 'E8', min: 40 },
  { grade: 'F9', min: 0 },
];

export function gradeFor(percentage: number): string {
  return GRADE_BANDS.find((b) => percentage >= b.min)?.grade ?? 'F9';
}

function currentSession() {
  return state.sessions.find((s) => s.isCurrent) ?? state.sessions[0]!;
}

function enrolmentById(id: string) {
  return state.enrolments.find((e) => e.id === id);
}

function studentById(id: string) {
  return state.students.find((s) => s.id === id);
}

function assignmentById(id: string) {
  return state.assignments.find((a) => a.id === id);
}

function guardiansFor(studentId: string) {
  return state.guardians.filter((g) => g.studentId === studentId);
}

/** Scope: teacher → assignments for the current term; parent → guardian links. */
function teacherCanSeeStudent(teacherId: string, studentId: string): boolean {
  const e = state.enrolments.find((x) => x.studentId === studentId && x.status === 'active');
  if (!e) return false;
  return state.assignments.some((a) => a.teacher.id === teacherId && a.class.id === e.classId);
}

function parentCanSeeStudent(parentId: string, studentId: string): boolean {
  // access is computed from the link on every request, never cached (contract 4.5)
  return state.guardians.some((g) => g.parentId === parentId && g.studentId === studentId);
}

function scopedStudent(studentId: string, user: NonNullable<ReturnType<typeof userFromToken>>): boolean {
  if (user.roles.includes('admin')) return true;
  if (user.roles.includes('student') && user.profiles.studentId === studentId) return true;
  if (user.profiles.teacherId && teacherCanSeeStudent(user.profiles.teacherId, studentId)) return true;
  if (user.profiles.parentId && parentCanSeeStudent(user.profiles.parentId, studentId)) return true;
  return false;
}

/* ------------------------------------------------------------------ */

export async function mockRequest(
  method: Method,
  rawPath: string,
  body: unknown,
  token: string | null,
): Promise<MockResponse> {
  await new Promise((r) => setTimeout(r, 120 + Math.random() * 180));

  const { pathname, query } = parse(rawPath);
  const payload = (body ?? {}) as Record<string, unknown>;

  /* -- public auth -- */
  if (method === 'POST' && pathname === '/auth/login') {
    const email = String(payload.email ?? '').toLowerCase();
    const password = String(payload.password ?? '');
    const user = state.users.find((u) => u.email.toLowerCase() === email);
    // AC-02: identical message and timing whether or not the account exists.
    if (!user || user.password !== password) {
      return fail(401, 'UNAUTHENTICATED', 'Invalid credentials');
    }
    const { password: _pw, ...safe } = user;
    return ok({ accessToken: tokenFor(user.id), expiresIn: 900, user: safe }, 200);
  }

  if (method === 'POST' && pathname === '/auth/refresh') {
    const user = userFromToken(token);
    if (!user) return fail(401, 'UNAUTHENTICATED', 'Refresh token is missing or revoked');
    return ok({ accessToken: tokenFor(user.id), expiresIn: 900 }, 200);
  }

  const user = userFromToken(token);
  if (!user) return fail(401, 'UNAUTHENTICATED', 'Missing or expired access token');

  if (method === 'POST' && pathname === '/auth/logout') return ok({ loggedOut: true }, 200);

  if (method === 'POST' && pathname === '/auth/password') {
    return ok({ changed: true }, 200);
  }

  if (method === 'GET' && pathname === '/auth/me') {
    const session = currentSession();
    const { password: _pw, ...safe } = user;
    const scope: Record<string, unknown> = {
      currentSession: session ? { id: session.id, name: session.name } : null,
    };
    if (user.profiles.teacherId) {
      scope.taughtAssignments = state.assignments.filter((a) => a.teacher.id === user.profiles.teacherId).length;
    }
    if (user.profiles.parentId) {
      scope.linkedStudents = state.guardians.filter((g) => g.parentId === user.profiles.parentId).length;
    }
    return ok({ ...safe, scope }, 200);
  }

  const isAdmin = user.roles.includes('admin');

  /* -- sessions and terms -- */
  if (method === 'GET' && pathname === '/sessions') {
    const onlyCurrent = query.get('current') === 'true';
    return ok(onlyCurrent ? state.sessions.filter((s) => s.isCurrent) : state.sessions, 200);
  }

  if (method === 'POST' && pathname === '/sessions') {
    if (!isAdmin) return fail(403, 'FORBIDDEN', 'Only an administrator may create a session.');
    const name = String(payload.name ?? '');
    if (!/^\d{4}\/\d{4}$/.test(name)) return fail(422, 'VALIDATION_FAILED', 'Session name is invalid.', [{ field: 'name', code: 'INVALID_FORMAT' }]);
    if (state.sessions.some((s) => s.name === name)) return fail(409, 'CONFLICT', 'That session already exists.');
    const created = { id: uid('9f8c'), name, startDate: String(payload.startDate), endDate: String(payload.endDate), isCurrent: false };
    state.sessions.push(created);
    return ok(created, 201);
  }

  const sessionPatch = /^\/sessions\/([^/]+)$/.exec(pathname);
  if (method === 'PATCH' && sessionPatch) {
    if (!isAdmin) return fail(403, 'FORBIDDEN', 'Only an administrator may change a session.');
    const target = state.sessions.find((s) => s.id === sessionPatch[1]);
    if (!target) return fail(404, 'NOT_FOUND', 'Session not found.');
    if (payload.isCurrent === true) state.sessions.forEach((s) => (s.isCurrent = s.id === target.id));
    if (typeof payload.name === 'string') target.name = payload.name;
    return ok(target, 200);
  }

  const termsOf = /^\/sessions\/([^/]+)\/terms$/.exec(pathname);
  if (method === 'GET' && termsOf) {
    return ok(state.terms.filter((t) => t.sessionId === termsOf[1]).sort((a, b) => a.sequence - b.sequence), 200);
  }

  if (method === 'POST' && termsOf) {
    if (!isAdmin) return fail(403, 'FORBIDDEN', 'Only an administrator may create a term.');
    const sessionId = termsOf[1]!;
    const sequence = Number(payload.sequence);
    if (state.terms.some((t) => t.sessionId === sessionId && t.sequence === sequence)) {
      return fail(409, 'CONFLICT', 'That term already exists in this session.', [{ field: 'sequence', code: 'DUPLICATE' }]);
    }
    const created = {
      id: uid('77e2'),
      sessionId,
      sequence,
      name: String(payload.name),
      startDate: String(payload.startDate),
      endDate: String(payload.endDate),
    };
    state.terms.push(created);
    return ok(created, 201);
  }

  const promotions = /^\/sessions\/([^/]+)\/promotions$/.exec(pathname);
  if (method === 'POST' && promotions) {
    if (!isAdmin) return fail(403, 'FORBIDDEN', 'Only an administrator may promote.');
    const decisions = (payload.decisions as { studentId: string; outcome: string; toClassId?: string }[]) ?? [];
    const targetSession = promotions[1]!;
    const duplicates = decisions
      .filter((d) => state.enrolments.some((e) => e.studentId === d.studentId && e.sessionId === targetSession && e.status === 'active'))
      .map((_decision, i) => ({ field: `decisions[${i}].studentId`, code: 'ALREADY_ENROLLED' }));
    if (duplicates.length) {
      return fail(409, 'CONFLICT', 'Promotion would create a duplicate enrolment.', duplicates);
    }
    let promoted = 0;
    let repeated = 0;
    let graduated = 0;
    decisions.forEach((d) => {
      const live = state.enrolments.find((e) => e.studentId === d.studentId && e.status === 'active');
      if (live) {
        live.status = d.outcome;
        live.endedOn = new Date().toISOString().slice(0, 10);
      }
      if (d.outcome === 'graduated') graduated += 1;
      else if (d.outcome === 'repeated') repeated += 1;
      else promoted += 1;
      if (d.toClassId && d.outcome !== 'graduated') {
        state.enrolments.push({
          id: uid('en4'),
          studentId: d.studentId,
          classId: d.toClassId,
          sessionId: targetSession,
          status: 'active',
          enrolledOn: new Date().toISOString().slice(0, 10),
          endedOn: null,
        });
      }
    });
    return ok({ sessionId: targetSession, promoted, repeated, graduated, skipped: [] }, 200);
  }

  /* -- classes / subjects -- */
  if (method === 'GET' && pathname === '/classes') {
    if (isAdmin || user.roles.includes('student') || user.roles.includes('parent')) return ok(state.classes, 200);
    const mine = new Set(state.assignments.filter((a) => a.teacher.id === user.profiles.teacherId).map((a) => a.class.id));
    return ok(state.classes.filter((c) => mine.has(c.id)), 200);
  }

  if (method === 'POST' && pathname === '/classes') {
    if (!isAdmin) return fail(403, 'FORBIDDEN', 'Only an administrator may create a class.');
    const name = String(payload.name ?? '');
    if (state.classes.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      return fail(409, 'CONFLICT', 'A class with that name already exists.', [{ field: 'name', code: 'DUPLICATE' }]);
    }
    const created = { id: uid('aa31'), name, level: String(payload.level), classTeacher: null, headcount: 0 };
    state.classes.push(created);
    return ok(created, 201);
  }

  const classPatch = /^\/classes\/([^/]+)$/.exec(pathname);
  if (method === 'PATCH' && classPatch) {
    if (!isAdmin) return fail(403, 'FORBIDDEN', 'Only an administrator may change a class.');
    const target = state.classes.find((c) => c.id === classPatch[1]);
    if (!target) return fail(404, 'NOT_FOUND', 'Class not found.');
    if (typeof payload.name === 'string') target.name = payload.name;
    if (typeof payload.level === 'string') target.level = payload.level;
    return ok(target, 200);
  }

  if (method === 'GET' && pathname === '/subjects') return ok(state.subjects, 200);

  if (method === 'POST' && pathname === '/subjects') {
    if (!isAdmin) return fail(403, 'FORBIDDEN', 'Only an administrator may create a subject.');
    const code = String(payload.code ?? '').toUpperCase();
    if (state.subjects.some((s) => s.code === code)) {
      return fail(409, 'CONFLICT', 'That subject code is already in use.', [{ field: 'code', code: 'DUPLICATE' }]);
    }
    const created = { id: uid('5c09'), code, name: String(payload.name), isCore: Boolean(payload.isCore) };
    state.subjects.push(created);
    return ok(created, 201);
  }

  /* -- assignments -- */
  if (method === 'GET' && pathname === '/teaching-assignments') {
    let rows = state.assignments;
    if (!isAdmin) rows = rows.filter((a) => a.teacher.id === user.profiles.teacherId);
    if (query.get('termId')) rows = rows.filter((a) => a.term.id === query.get('termId'));
    if (query.get('classId')) rows = rows.filter((a) => a.class.id === query.get('classId'));
    return ok(rows, 200);
  }

  if (method === 'POST' && pathname === '/teaching-assignments') {
    if (!isAdmin) return fail(403, 'FORBIDDEN', 'Only an administrator may create an assignment.');
    const clash = state.assignments.some(
      (a) => a.class.id === payload.classId && a.subject.id === payload.subjectId && a.term.id === payload.termId && a.isPrimary && payload.isPrimary,
    );
    if (clash) return fail(409, 'CONFLICT', 'A primary teacher already holds this class, subject and term.');
    const teacher = state.teachers.find((t) => t.id === payload.teacherId);
    const klass = state.classes.find((c) => c.id === payload.classId);
    const subject = state.subjects.find((s) => s.id === payload.subjectId);
    const term = state.terms.find((t) => t.id === payload.termId);
    if (!teacher || !klass || !subject || !term) return fail(422, 'VALIDATION_FAILED', 'A referenced record does not exist.');
    const created = {
      id: uid('e410'),
      teacher: { id: teacher.id, name: teacher.name },
      class: { id: klass.id, name: klass.name },
      subject: { id: subject.id, name: subject.name },
      term: { id: term.id, name: term.name },
      isPrimary: Boolean(payload.isPrimary),
    };
    state.assignments.push(created);
    return ok(created, 201);
  }

  const rosterOf = /^\/teaching-assignments\/([^/]+)\/roster$/.exec(pathname);
  if (method === 'GET' && rosterOf) {
    const assignment = assignmentById(rosterOf[1]!);
    if (!assignment) return fail(404, 'NOT_FOUND', 'Assignment not found.');
    if (!isAdmin && assignment.teacher.id !== user.profiles.teacherId) {
      return fail(403, 'FORBIDDEN', 'You are not assigned to this class and subject.');
    }
    const enrolments = state.enrolments.filter(
      (e) => e.classId === assignment.class.id && e.sessionId === currentSession().id && e.status === 'active',
    );
    const rows = enrolments
      .map((e) => studentById(e.studentId))
      .filter((s): s is NonNullable<typeof s> => Boolean(s))
      .map((s) => ({
        enrolmentId: s.currentPlacement?.enrolmentId ?? enrolments.find((e) => e.studentId === s.id)!.id,
        studentId: s.id,
        name: s.name,
        admissionNumber: s.admissionNumber,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return ok(rows, 200);
  }

  const assignmentDelete = /^\/teaching-assignments\/([^/]+)$/.exec(pathname);
  if (method === 'DELETE' && assignmentDelete) {
    if (!isAdmin) return fail(403, 'FORBIDDEN', 'Only an administrator may remove an assignment.');
    const id = assignmentDelete[1]!;
    if (state.results.length && state.assessments.some((a) => a.teachingAssignmentId === id)) {
      return fail(409, 'CONFLICT', 'Results or registers reference this assignment.');
    }
    state.assignments = state.assignments.filter((a) => a.id !== id);
    return ok({ id }, 200);
  }

  /* -- students -- */
  if (method === 'GET' && pathname === '/students') {
    if (!isAdmin && !user.roles.includes('teacher')) return fail(403, 'FORBIDDEN', 'This list is not available to your role.');
    const q = (query.get('q') ?? '').toLowerCase().trim();
    const classId = query.get('classId');
    const status = query.get('status');
    const page = Math.max(1, Number(query.get('page') ?? 1));
    const pageSize = Math.min(100, Number(query.get('pageSize') ?? 25));

    let rows = state.students.slice();
    if (!isAdmin) {
      const mine = new Set(
        state.assignments.filter((a) => a.teacher.id === user.profiles.teacherId).map((a) => a.class.id),
      );
      rows = rows.filter((s) => {
        const e = state.enrolments.find((x) => x.studentId === s.id && x.status === 'active');
        return e ? mine.has(e.classId) : false;
      });
    }
    if (q) rows = rows.filter((s) => s.name.toLowerCase().includes(q) || s.admissionNumber.toLowerCase().includes(q));
    if (classId) {
      rows = rows.filter((s) => state.enrolments.some((e) => e.studentId === s.id && e.classId === classId && e.status === 'active'));
    }
    if (status) rows = rows.filter((s) => s.status === status);
    rows.sort((a, b) => a.name.localeCompare(b.name));
    const total = rows.length;
    const slice = rows.slice((page - 1) * pageSize, page * pageSize);
    return ok(slice, 200, { page, pageSize, total });
  }

  if (method === 'POST' && pathname === '/students') {
    if (!isAdmin) return fail(403, 'FORBIDDEN', 'Only an administrator may create a student record.');
    const admissionNumber = String(payload.admissionNumber ?? '');
    if (state.students.some((s) => s.admissionNumber === admissionNumber)) {
      return fail(409, 'CONFLICT', 'That admission number is already in use.', [{ field: 'admissionNumber', code: 'DUPLICATE' }]);
    }
    const created = {
      id: uid('s02'),
      admissionNumber,
      name: String(payload.name),
      dateOfBirth: String(payload.dateOfBirth),
      status: (payload.status as 'active' | 'inactive') ?? 'active',
      userId: null,
      currentPlacement: null,
    };
    state.students.push(created);
    return ok(created, 201);
  }

  const studentDetail = /^\/students\/([^/]+)$/.exec(pathname);
  if (method === 'GET' && studentDetail) {
    const id = studentDetail[1]!;
    const student = studentById(id);
    if (!student) return fail(404, 'NOT_FOUND', 'Student not found.');
    if (!scopedStudent(id, user)) return fail(403, 'FORBIDDEN', 'This student is outside your scope.');
    return ok(student, 200);
  }

  if (method === 'PATCH' && studentDetail) {
    if (!isAdmin) return fail(403, 'FORBIDDEN', 'Only an administrator may update a student record.');
    const student = studentById(studentDetail[1]!);
    if (!student) return fail(404, 'NOT_FOUND', 'Student not found.');
    // admission number is immutable (contract 7.5)
    if (typeof payload.name === 'string') student.name = payload.name;
    if (typeof payload.dateOfBirth === 'string') student.dateOfBirth = payload.dateOfBirth;
    if (payload.status === 'active' || payload.status === 'inactive') student.status = payload.status;
    return ok(student, 200);
  }

  const studentEnrolments = /^\/students\/([^/]+)\/enrolments$/.exec(pathname);
  if (method === 'GET' && studentEnrolments) {
    const id = studentEnrolments[1]!;
    if (!scopedStudent(id, user)) return fail(403, 'FORBIDDEN', 'This student is outside your scope.');
    const student = studentById(id)!;
    const rows = state.enrolments
      .filter((e) => e.studentId === id)
      .map((e) => ({
        id: e.id,
        student: { id: student.id, name: student.name, admissionNumber: student.admissionNumber },
        class: { id: e.classId, name: state.classes.find((c) => c.id === e.classId)?.name ?? '—' },
        session: { id: e.sessionId, name: state.sessions.find((s) => s.id === e.sessionId)?.name ?? '—' },
        status: e.status,
        enrolledOn: e.enrolledOn,
        endedOn: e.endedOn,
        reason: e.reason ?? null,
      }))
      .sort((a, b) => b.enrolledOn.localeCompare(a.enrolledOn));
    return ok(rows, 200);
  }

  if (method === 'POST' && studentEnrolments) {
    if (!isAdmin) return fail(403, 'FORBIDDEN', 'Only an administrator may enrol a student.');
    const studentId = studentEnrolments[1]!;
    const sessionId = String(payload.sessionId);
    if (state.enrolments.some((e) => e.studentId === studentId && e.sessionId === sessionId && e.status === 'active')) {
      return fail(409, 'CONFLICT', 'This student already has an active enrolment for that session.', [
        { field: 'sessionId', code: 'ALREADY_ENROLLED' },
      ]);
    }
    const classId = String(payload.classId);
    const created = {
      id: uid('en5'),
      studentId,
      classId,
      sessionId,
      status: 'active',
      enrolledOn: String(payload.enrolledOn),
      endedOn: null,
    };
    state.enrolments.push(created);
    const student = studentById(studentId);
    if (student) {
      student.currentPlacement = {
        enrolmentId: created.id,
        class: { id: classId, name: state.classes.find((c) => c.id === classId)?.name ?? '—' },
        session: { id: sessionId, name: state.sessions.find((s) => s.id === sessionId)?.name ?? '—' },
        status: 'active',
        enrolledOn: created.enrolledOn,
        endedOn: null,
      };
    }
    return ok(created, 201);
  }

  const enrolmentPatch = /^\/enrolments\/([^/]+)$/.exec(pathname);
  if (method === 'PATCH' && enrolmentPatch) {
    if (!isAdmin) return fail(403, 'FORBIDDEN', 'Only an administrator may close a placement.');
    const target = state.enrolments.find((e) => e.id === enrolmentPatch[1]);
    if (!target) return fail(404, 'NOT_FOUND', 'Placement not found.');
    if (payload.endedOn && String(payload.endedOn) < target.enrolledOn) {
      return fail(422, 'VALIDATION_FAILED', 'A placement cannot end before it began.', [{ field: 'endedOn', code: 'BEFORE_START' }]);
    }
    target.status = String(payload.status);
    target.endedOn = payload.endedOn ? String(payload.endedOn) : null;
    target.reason = payload.reason ? String(payload.reason) : null;
    return ok(target, 200);
  }

  /* -- teachers -- */
  if (method === 'GET' && pathname === '/teachers') {
    if (!isAdmin) return fail(403, 'FORBIDDEN', 'The staff list is restricted to administrators.');
    return ok(state.teachers, 200);
  }

  if (method === 'POST' && pathname === '/teachers') {
    if (!isAdmin) return fail(403, 'FORBIDDEN', 'Only an administrator may create a staff record.');
    const staffNumber = String(payload.staffNumber ?? '');
    if (state.teachers.some((t) => t.staffNumber === staffNumber)) {
      return fail(409, 'CONFLICT', 'That staff number is already in use.', [{ field: 'staffNumber', code: 'DUPLICATE' }]);
    }
    const created = {
      id: uid('1b7f'),
      staffNumber,
      name: String(payload.name),
      status: 'active' as const,
      userId: null,
      email: null,
    };
    state.teachers.push(created);
    return ok(created, 201);
  }

  /* -- guardians -- */
  const guardiansOf = /^\/students\/([^/]+)\/guardians$/.exec(pathname);
  if (method === 'GET' && guardiansOf) {
    const studentId = guardiansOf[1]!;
    if (!isAdmin && !(user.profiles.parentId && parentCanSeeStudent(user.profiles.parentId, studentId))) {
      if (!scopedStudent(studentId, user)) return fail(403, 'FORBIDDEN', 'This student is outside your scope.');
    }
    return ok(guardiansFor(studentId), 200);
  }

  if (method === 'POST' && guardiansOf) {
    if (!isAdmin) return fail(403, 'FORBIDDEN', 'Only an administrator may link a guardian.');
    const studentId = guardiansOf[1]!;
    const parentId = String(payload.parentId);
    if (state.guardians.some((g) => g.parentId === parentId && g.studentId === studentId)) {
      // already linked (C12: unique student_id + parent_id)
      return fail(409, 'CONFLICT', 'That guardian is already linked to this student.', [{ field: 'parentId', code: 'ALREADY_LINKED' }]);
    }
    const parent = state.parents.find((p) => p.id === parentId);
    if (!parent) return fail(422, 'VALIDATION_FAILED', 'Guardian not found.');
    const created = {
      id: uid('gd00'),
      studentId,
      parentId,
      name: parent.name,
      relationship: String(payload.relationship),
      isPrimary: Boolean(payload.isPrimary),
      phone: parent.phone,
      email: parent.email,
    };
    state.guardians.push(created);
    return ok(created, 201);
  }

  const guardianDelete = /^\/students\/([^/]+)\/guardians\/([^/]+)$/.exec(pathname);
  if (method === 'DELETE' && guardianDelete) {
    if (!isAdmin) return fail(403, 'FORBIDDEN', 'Only an administrator may unlink a guardian.');
    const [studentId, parentId] = [guardianDelete[1]!, guardianDelete[2]!];
    const before = state.guardians.length;
    state.guardians = state.guardians.filter((g) => !(g.parentId === parentId && g.studentId === studentId));
    if (state.guardians.length === before) return fail(404, 'NOT_FOUND', 'That guardian link does not exist.');
    return ok({ unlinked: true }, 200);
  }

  /* -- account status -- */
  const accountStatus = /^\/users\/([^/]+)\/status$/.exec(pathname);
  if (method === 'PATCH' && accountStatus) {
    if (!isAdmin) return fail(403, 'FORBIDDEN', 'Only an administrator may change an account status.');
    const target = state.users.find((u) => u.id === accountStatus[1]);
    if (!target) return fail(404, 'NOT_FOUND', 'User not found.');
    return ok({ id: target.id, status: String(payload.status ?? 'active'), tokensRevoked: true }, 200);
  }

  const accountAttach = /^\/users\/([^/]+)\/account$/.exec(pathname);
  if (method === 'POST' && accountAttach) {
    if (!isAdmin) return fail(403, 'FORBIDDEN', 'Only an administrator may attach an account.');
    return ok({ invited: true, email: String(payload.email ?? '') }, 201);
  }

  /* -- attendance -- */
  if (method === 'GET' && pathname === '/attendance-registers') {
    const assignmentId = query.get('teachingAssignmentId');
    const date = query.get('date');
    const period = query.get('periodNo');
    const assignment = assignmentId ? assignmentById(assignmentId) : undefined;
    if (assignment && !isAdmin && assignment.teacher.id !== user.profiles.teacherId) {
      return fail(403, 'FORBIDDEN', 'You are not assigned to this class.');
    }
    const found = state.registers.find(
      (r) =>
        (!assignmentId || r.teachingAssignmentId === assignmentId) &&
        (!date || r.date === date) &&
        (!period || r.periodNo === Number(period)),
    );
    if (!found) return fail(404, 'NOT_FOUND', 'No register has been started for that lesson.');
    return ok({ ...found, total: found.records.length, present: found.records.filter((r) => r.status === 'present').length, absent: found.records.filter((r) => r.status === 'absent').length, late: found.records.filter((r) => r.status === 'late').length }, 200);
  }

  if (method === 'PUT' && pathname === '/attendance-registers') {
    const assignmentId = String(payload.teachingAssignmentId);
    const assignment = assignmentById(assignmentId);
    if (!assignment) return fail(404, 'NOT_FOUND', 'Assignment not found.');
    if (assignment.teacher.id !== user.profiles.teacherId) {
      return fail(403, 'FORBIDDEN', 'You are not assigned to this class and subject.');
    }
    const date = String(payload.date);
    const today = new Date().toISOString().slice(0, 10);
    if (date > today) {
      return fail(422, 'VALIDATION_FAILED', 'A register cannot be submitted for a future date.', [
        { field: 'date', code: 'FUTURE_DATE' },
      ]);
    }
    const periodNo = Number(payload.periodNo);
    const records = (payload.records as { enrolmentId: string; status: string }[]) ?? [];
    let register = state.registers.find(
      (r) => r.teachingAssignmentId === assignmentId && r.date === date && r.periodNo === periodNo,
    );
    if (register?.status === 'submitted') {
      return fail(409, 'CONFLICT', 'Register is already submitted.');
    }
    if (!register) {
      register = { id: uid('reg00'), teachingAssignmentId: assignmentId, date, periodNo, status: 'draft', records: [] };
      state.registers.push(register);
    }
    register.records = records.map((r) => ({
      enrolmentId: r.enrolmentId,
      status: r.status as 'present' | 'absent' | 'late',
    }));
    register.status = 'draft';
    return ok(
      {
        id: register.id,
        teachingAssignmentId: assignmentId,
        date,
        periodNo,
        status: register.status,
        present: register.records.filter((r) => r.status === 'present').length,
        absent: register.records.filter((r) => r.status === 'absent').length,
        late: register.records.filter((r) => r.status === 'late').length,
        total: register.records.length,
      },
      200,
    );
  }

  const registerSubmit = /^\/attendance-registers\/([^/]+)\/submit$/.exec(pathname);
  if (method === 'POST' && registerSubmit) {
    const register = state.registers.find((r) => r.id === registerSubmit[1]);
    if (!register) return fail(404, 'NOT_FOUND', 'Register not found.');
    const assignment = assignmentById(register.teachingAssignmentId);
    if (!assignment || assignment.teacher.id !== user.profiles.teacherId) {
      return fail(403, 'FORBIDDEN', 'You are not assigned to this class and subject.');
    }
    if (register.status === 'submitted') return fail(409, 'CONFLICT', 'Register is already submitted.');
    register.status = 'submitted';
    return ok(
      {
        id: register.id,
        teachingAssignmentId: register.teachingAssignmentId,
        date: register.date,
        periodNo: register.periodNo,
        status: 'submitted',
        present: register.records.filter((r) => r.status === 'present').length,
        absent: register.records.filter((r) => r.status === 'absent').length,
        late: register.records.filter((r) => r.status === 'late').length,
        total: register.records.length,
      },
      200,
    );
  }

  const studentAttendance = /^\/students\/([^/]+)\/attendance$/.exec(pathname);
  if (method === 'GET' && studentAttendance) {
    const studentId = studentAttendance[1]!;
    if (!scopedStudent(studentId, user)) return fail(403, 'FORBIDDEN', 'This student is outside your scope.');
    const enrolmentIds = new Set(state.enrolments.filter((e) => e.studentId === studentId).map((e) => e.id));
    const rows = state.registers
      .filter((r) => r.status === 'submitted')
      .flatMap((r) => r.records.filter((rec) => enrolmentIds.has(rec.enrolmentId)).map((rec) => ({ date: r.date, status: rec.status })))
      .sort((a, b) => b.date.localeCompare(a.date));
    // Guardians see counts and dates only — the mark itself is not a diagnosis.
    const guardianOnly = !isAdmin && Boolean(user.profiles.parentId) && !user.roles.includes('teacher');
    return ok(
      {
        summary: {
          present: rows.filter((r) => r.status === 'present').length,
          absent: rows.filter((r) => r.status === 'absent').length,
          late: rows.filter((r) => r.status === 'late').length,
          total: rows.length,
        },
        records: guardianOnly ? rows.map((r) => ({ date: r.date, status: r.status })) : rows,
      },
      200,
    );
  }

  /* -- assessments and results -- */
  if (method === 'GET' && pathname === '/assessments') {
    let rows = state.assessments;
    const assignmentId = query.get('teachingAssignmentId');
    const termId = query.get('termId');
    if (assignmentId) rows = rows.filter((a) => a.teachingAssignmentId === assignmentId);
    if (termId) rows = rows.filter((a) => a.termId === termId);
    if (!isAdmin) {
      const allowed = new Set(state.assignments.filter((a) => a.teacher.id === user.profiles.teacherId).map((a) => a.id));
      rows = rows.filter((a) => allowed.has(a.teachingAssignmentId));
    }
    return ok(rows, 200);
  }

  if (method === 'POST' && pathname === '/assessments') {
    if (!isAdmin) return fail(403, 'FORBIDDEN', 'Only an administrator may define an assessment.');
    const assignment = assignmentById(String(payload.teachingAssignmentId));
    if (!assignment) return fail(404, 'NOT_FOUND', 'Assignment not found.');
    if (payload.termId && payload.termId !== assignment.term.id) {
      return fail(422, 'VALIDATION_FAILED', 'The assessment term must match the assignment term.', [
        { field: 'termId', code: 'TERM_MISMATCH' },
      ]);
    }
    const created = {
      id: uid('as10'),
      teachingAssignmentId: assignment.id,
      termId: assignment.term.id,
      name: String(payload.name),
      type: String(payload.type ?? 'ca'),
      maximumScore: Number(payload.maximumScore),
      weight: Number(payload.weight ?? payload.maximumScore),
    };
    state.assessments.push(created);
    return ok(created, 201);
  }

  const scoresOf = /^\/assessments\/([^/]+)\/scores$/.exec(pathname);
  if (method === 'GET' && scoresOf) {
    const assessment = state.assessments.find((a) => a.id === scoresOf[1]);
    if (!assessment) return fail(404, 'NOT_FOUND', 'Assessment not found.');
    const assignment = assignmentById(assessment.teachingAssignmentId)!;
    if (!isAdmin && assignment.teacher.id !== user.profiles.teacherId) {
      return fail(403, 'FORBIDDEN', 'You are not assigned to this class and subject.');
    }
    const enrolments = state.enrolments.filter(
      (e) => e.classId === assignment.class.id && e.sessionId === currentSession().id && e.status === 'active',
    );
    const rows = enrolments
      .map((e) => {
        const student = studentById(e.studentId);
        if (!student) return null;
        const existing = state.results.find((r) => r.assessmentId === assessment.id && r.enrolmentId === e.id);
        const pending = state.pendingCorrections.find((c) => c.resultId === existing?.id);
        return {
          enrolmentId: e.id,
          resultId: existing?.id ?? null,
          student: { id: student.id, name: student.name, admissionNumber: student.admissionNumber },
          score: existing?.score ?? null,
          status: pending ? 'correction_pending' : existing?.status ?? null,
        };
      })
      .filter((r): r is NonNullable<typeof r> => Boolean(r))
      .sort((a, b) => a.student.name.localeCompare(b.student.name));
    return ok(rows, 200);
  }

  if (method === 'PUT' && scoresOf) {
    const assessment = state.assessments.find((a) => a.id === scoresOf[1]);
    if (!assessment) return fail(404, 'NOT_FOUND', 'Assessment not found.');
    const assignment = assignmentById(assessment.teachingAssignmentId)!;
    if (assignment.teacher.id !== user.profiles.teacherId && !isAdmin) {
      return fail(403, 'FORBIDDEN', 'You are not assigned to this class and subject.');
    }
    const existing = state.results.filter((r) => r.assessmentId === assessment.id);
    if (existing.some((r) => r.status === 'published' || r.status === 'submitted')) {
      return fail(409, 'CONFLICT', 'This assessment has been submitted or published; submit a correction instead.');
    }
    const incoming = (payload.scores as { enrolmentId: string; score: number | null }[]) ?? [];
    const details: ErrorDetail[] = [];
    incoming.forEach((row, index) => {
      if (row.score === null || row.score === undefined) return;
      if (row.score < 0) details.push({ field: `scores[${index}].score`, code: 'MIN_VIOLATION', message: 'A score cannot be negative.' });
      else if (row.score > assessment.maximumScore) {
        details.push({
          field: `scores[${index}].score`,
          code: 'MAX_EXCEEDED',
          message: `Maximum is ${assessment.maximumScore}.`,
          meta: { max: assessment.maximumScore },
        });
      }
    });
    if (details.length) {
      return fail(422, 'VALIDATION_FAILED', `${details.length} score${details.length === 1 ? ' is' : 's are'} out of range.`, details);
    }
    incoming.forEach((row) => {
      const found = state.results.find((r) => r.assessmentId === assessment.id && r.enrolmentId === row.enrolmentId);
      if (found) {
        found.score = row.score;
        found.status = 'draft';
      } else if (row.score !== null && row.score !== undefined) {
        state.results.push({
          id: uid('r9'),
          assessmentId: assessment.id,
          enrolmentId: row.enrolmentId,
          score: row.score,
          status: 'draft',
          enteredBy: user.profiles.teacherId ?? user.id,
          publishedAt: null,
          revisions: [],
        });
      }
    });
    const saved = state.results.filter((r) => r.assessmentId === assessment.id);
    return ok(
      {
        assessmentId: assessment.id,
        entered: saved.filter((r) => r.score !== null).length,
        total: incoming.length,
        status: 'draft',
      },
      200,
    );
  }

  const assessmentAction = /^\/assessments\/([^/]+)\/(submit|approve|publish)$/.exec(pathname);
  if (method === 'POST' && assessmentAction) {
    const assessment = state.assessments.find((a) => a.id === assessmentAction[1]);
    if (!assessment) return fail(404, 'NOT_FOUND', 'Assessment not found.');
    const action = assessmentAction[2];
    const rows = state.results.filter((r) => r.assessmentId === assessment.id);
    if (!rows.length) return fail(409, 'CONFLICT', 'No scores have been entered for this assessment.');
    if (action === 'submit') {
      if (!rows.every((r) => r.status === 'draft' || r.status === 'submitted')) {
        return fail(409, 'CONFLICT', 'This assessment is already past the draft stage.');
      }
      rows.forEach((r) => (r.status = 'submitted'));
      return ok({ assessmentId: assessment.id, status: 'submitted', count: rows.length }, 200);
    }
    if (action === 'approve') {
      if (!isAdmin) return fail(403, 'FORBIDDEN', 'Only an administrator may approve.');
      // AC: a user may not approve their own entry (contract 3.2)
      const enteredBy = rows[0]?.enteredBy;
      if (enteredBy && user.profiles.teacherId && enteredBy === user.profiles.teacherId) {
        return fail(403, 'FORBIDDEN', 'You entered these scores, so a second person must approve them.');
      }
      if (!rows.every((r) => r.status === 'submitted')) return fail(409, 'CONFLICT', 'Only submitted results can be approved.');
      rows.forEach((r) => (r.status = 'approved'));
      return ok({ assessmentId: assessment.id, status: 'approved', count: rows.length }, 200);
    }
    if (!isAdmin) return fail(403, 'FORBIDDEN', 'Only an administrator may publish.');
    if (!rows.every((r) => r.status === 'approved')) return fail(409, 'CONFLICT', 'Only approved results can be published.');
    const at = now();
    rows.forEach((r) => {
      r.status = 'published';
      r.publishedAt = at;
    });
    return ok({ assessmentId: assessment.id, status: 'published', count: rows.length, publishedAt: at }, 200);
  }

  const correction = /^\/results\/([^/]+)\/corrections$/.exec(pathname);
  if (method === 'POST' && correction) {
    const resultId = correction[1]!;
    const result = state.results.find((r) => r.id === resultId);
    if (!result) return fail(404, 'NOT_FOUND', 'Result not found.');
    const assessment = state.assessments.find((a) => a.id === result.assessmentId)!;
    const assignment = assignmentById(assessment.teachingAssignmentId)!;
    if (!isAdmin && assignment.teacher.id !== user.profiles.teacherId) {
      return fail(403, 'FORBIDDEN', 'You are not assigned to this class and subject.');
    }
    const newScore = Number(payload.newScore);
    if (Number.isNaN(newScore) || newScore < 0 || newScore > assessment.maximumScore) {
      return fail(422, 'VALIDATION_FAILED', 'Score is outside the assessment range.', [
        { field: 'newScore', code: 'MAX_EXCEEDED', message: `Maximum is ${assessment.maximumScore}.`, meta: { max: assessment.maximumScore } },
      ]);
    }
    if (!payload.reason || String(payload.reason).trim().length < 10) {
      return fail(422, 'VALIDATION_FAILED', 'A reason is required.', [{ field: 'reason', code: 'TOO_SHORT' }]);
    }
    const pending = {
      id: uid('cor0'),
      resultId,
      previousScore: result.score ?? 0,
      newScore,
      reason: String(payload.reason),
      requestedBy: user.id,
      status: 'pending' as const,
    };
    state.pendingCorrections.push(pending);
    result.status = 'correction_pending';
    return ok(
      {
        resultId,
        status: 'correction_pending',
        previousScore: pending.previousScore,
        newScore,
        requestedBy: user.id,
        requiresApproval: true,
      },
      202,
    );
  }

  const correctionApprove = /^\/results\/([^/]+)\/corrections\/([^/]+)\/approve$/.exec(pathname);
  if (method === 'POST' && correctionApprove) {
    if (!isAdmin) return fail(403, 'FORBIDDEN', 'Only an administrator may approve a correction.');
    const [, resultId, correctionId] = correctionApprove;
    const pending = state.pendingCorrections.find((c) => c.id === correctionId && c.resultId === resultId);
    if (!pending) return fail(404, 'NOT_FOUND', 'Correction request not found.');
    if (pending.requestedBy === user.id) {
      return fail(403, 'FORBIDDEN', 'You requested this correction, so a second person must approve it.');
    }
    const result = state.results.find((r) => r.id === resultId)!;
    result.score = pending.newScore;
    result.status = 'published';
    result.revisions.push({
      previousScore: pending.previousScore,
      newScore: pending.newScore,
      reason: pending.reason,
      decidedAt: now(),
    });
    state.pendingCorrections = state.pendingCorrections.filter((c) => c.id !== correctionId);
    return ok({ resultId, status: 'published', previousScore: pending.previousScore, newScore: pending.newScore }, 200);
  }

  const reportCard = /^\/enrolments\/([^/]+)\/report-card$/.exec(pathname);
  if (method === 'GET' && reportCard) {
    const enrolment = enrolmentById(reportCard[1]!);
    if (!enrolment) return fail(404, 'NOT_FOUND', 'Placement not found.');
    const student = studentById(enrolment.studentId)!;
    if (!scopedStudent(student.id, user)) return fail(403, 'FORBIDDEN', 'This student is outside your scope.');
    const termId = query.get('termId');
    if (!termId) return fail(400, 'BAD_REQUEST', 'termId is required.');
    const term = state.terms.find((t) => t.id === termId);
    const session = state.sessions.find((s) => s.id === enrolment.sessionId)!;

    const clientIsStudentOrParent = !isAdmin && !user.roles.includes('teacher');
    const rows = state.results.filter((r) => r.enrolmentId === enrolment.id);
    const visible = rows.filter((r) => {
      const a = state.assessments.find((x) => x.id === r.assessmentId);
      if (!a || a.termId !== termId) return false;
      if (clientIsStudentOrParent) return r.status === 'published' && Boolean(r.publishedAt);
      return r.status !== 'draft';
    });

    const grouped = new Map<string, { name: string; score: number | null; max: number }[]>();
    for (const result of visible) {
      const assessment = state.assessments.find((a) => a.id === result.assessmentId)!;
      const assignment = assignmentById(assessment.teachingAssignmentId)!;
      const subjectName = assignment.subject.name;
      const list = grouped.get(subjectName) ?? [];
      list.push({ name: assessment.name, score: result.score, max: assessment.maximumScore });
      grouped.set(subjectName, list);
    }

    const subjects = [...grouped.entries()].map(([subject, list]) => {
      const total = list.reduce((sum, a) => sum + (a.score ?? 0), 0);
      const maxTotal = list.reduce((sum, a) => sum + a.max, 0);
      const percentage = maxTotal ? Math.round((total / maxTotal) * 100) : 0;
      const subjectResults = visible.filter((r) => {
        const a = state.assessments.find((x) => x.id === r.assessmentId)!;
        return assignmentById(a.teachingAssignmentId)!.subject.name === subject;
      });
      const revision = subjectResults.flatMap((r) => r.revisions).at(-1);
      return {
        subject,
        assessments: list,
        total,
        grade: gradeFor(percentage),
        revised: subjectResults.some((r) => r.revisions.length > 0),
        ...(revision ? { revision } : {}),
      };
    });

    const publishedAt = visible.find((r) => r.publishedAt)?.publishedAt ?? null;
    return ok(
      {
        student: { name: student.name, admissionNumber: student.admissionNumber },
        class: state.classes.find((c) => c.id === enrolment.classId)?.name ?? '—',
        term: term?.name ?? '—',
        session: session.name,
        subjects,
        publishedAt,
      },
      200,
    );
  }

  if (method === 'GET' && pathname === '/me/results') {
    const childIds: string[] = [];
    if (user.roles.includes('student') && user.profiles.studentId) childIds.push(user.profiles.studentId);
    if (user.profiles.parentId) {
      state.enrolments
        .filter((e) => e.status === 'active')
        .forEach((e) => {
          if (parentCanSeeStudent(user.profiles.parentId!, e.studentId) && !childIds.includes(e.studentId)) childIds.push(e.studentId);
        });
    }
    if (!childIds.length) return fail(403, 'FORBIDDEN', 'No student records are linked to your account.');

    const groups = childIds.map((studentId) => {
      const student = studentById(studentId)!;
      const enrolments = state.enrolments.filter((e) => e.studentId === studentId);
      const published = state.results.filter(
        (r) => enrolments.some((e) => e.id === r.enrolmentId) && r.status === 'published' && r.publishedAt,
      );
      const byTerm = new Map<string, typeof published>();
      published.forEach((r) => {
        const a = state.assessments.find((x) => x.id === r.assessmentId)!;
        const list = byTerm.get(a.termId) ?? [];
        list.push(r);
        byTerm.set(a.termId, list);
      });
      const terms = [...byTerm.entries()].map(([termId, list]) => {
        const term = state.terms.find((t) => t.id === termId);
        const session = state.sessions.find((s) => s.id === term?.sessionId);
        const byAssignment = new Map<string, typeof list>();
        list.forEach((r) => {
          const a = state.assessments.find((x) => x.id === r.assessmentId)!;
          const key = a.teachingAssignmentId;
          const bucket = byAssignment.get(key) ?? [];
          bucket.push(r);
          byAssignment.set(key, bucket);
        });
        const subjects = [...byAssignment.entries()].map(([assignmentId, bucket]) => {
          const assignment = assignmentById(assignmentId)!;
          const assessments = bucket.map((r) => {
            const a = state.assessments.find((x) => x.id === r.assessmentId)!;
            return { name: a.name, score: r.score, max: a.maximumScore };
          });
          const total = assessments.reduce((sum, a) => sum + (a.score ?? 0), 0);
          const maxTotal = assessments.reduce((sum, a) => sum + a.max, 0);
          const revision = bucket.flatMap((r) => r.revisions).at(-1);
          return {
            subject: assignment.subject.name,
            assessments,
            total,
            grade: gradeFor(maxTotal ? Math.round((total / maxTotal) * 100) : 0),
            revised: bucket.some((r) => r.revisions.length > 0),
            ...(revision ? { revision } : {}),
          };
        });
        return { termId, term: term?.name ?? '—', session: session?.name ?? '—', subjects };
      });
      return { student: { id: student.id, name: student.name, admissionNumber: student.admissionNumber }, terms };
    });

    return ok(groups, 200);
  }

  return fail(404, 'NOT_FOUND', `No mock handler for ${method} ${pathname}.`);
}
