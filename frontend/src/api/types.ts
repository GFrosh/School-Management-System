/**
 * Types transcribed from the API contract (SMS Phase 1, section 7).
 * camelCase on the wire per 7.1. Nothing here is invented: each block names
 * the contract clause it comes from. Where the contract describes behaviour
 * but does not print a body, the shape is derived from the entity dictionary
 * in section 5.5 and is flagged as DERIVED.
 */

export type Role = 'admin' | 'teacher' | 'student' | 'parent';

/* ---- 7.2 envelope and error format ---- */

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
}

export interface Envelope<T> {
  data: T;
  meta?: PageMeta;
}

export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION_FAILED'
  | 'ACCOUNT_LOCKED'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export interface ErrorDetail {
  /** Addressable path, e.g. "scores[1].score" or "decisions[2].studentId". */
  field: string;
  code: string;
  message?: string;
  meta?: Record<string, unknown>;
}

export interface ErrorEnvelope {
  error: {
    code: ErrorCode;
    message: string;
    details?: ErrorDetail[];
    requestId?: string;
  };
}

/* ---- 7.3 authentication ---- */

export interface User {
  id: string;
  email: string;
  displayName: string;
  roles: Role[];
  profiles: {
    teacherId: string | null;
    parentId: string | null;
    studentId: string | null;
  };
}

export interface Me extends User {
  scope: {
    /** teacher only: count of active assignments */
    taughtAssignments?: number;
    /** parent only: count of guardian links */
    linkedStudents?: number;
    currentSession: { id: string; name: string } | null;
  };
}

export interface LoginResult {
  accessToken: string;
  expiresIn: number;
  user: User;
}

/* ---- 7.4 academic structure ---- */

export interface Ref {
  id: string;
  name: string;
}

export interface AcademicSession {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export interface Term {
  id: string;
  sessionId: string;
  sequence: number;
  name: string;
  startDate: string;
  endDate: string;
}

export interface SchoolClass {
  id: string;
  name: string;
  level: string;
  classTeacher: Ref | null;
  /** current headcount for the active session */
  headcount?: number;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  isCore: boolean;
}

export interface Assignment {
  id: string;
  teacher: Ref;
  class: Ref;
  subject: Ref;
  term: Ref;
  isPrimary: boolean;
}

/* ---- 7.5 students, staff, guardians ---- */

export type EnrolmentStatus =
  | 'active'
  | 'promoted'
  | 'repeated'
  | 'graduated'
  | 'transferred'
  | 'withdrawn';

export type StudentStatus = 'active' | 'inactive';

export interface Placement {
  enrolmentId: string;
  class: Ref;
  session: Ref;
  status: EnrolmentStatus;
  enrolledOn: string;
  endedOn: string | null;
}

export interface Student {
  id: string;
  admissionNumber: string;
  name: string;
  dateOfBirth: string;
  status: StudentStatus;
  userId: string | null;
  currentPlacement: Placement | null;
}

export interface Enrolment {
  id: string;
  student: { id: string; name: string; admissionNumber: string };
  class: Ref;
  session: Ref;
  status: EnrolmentStatus;
  enrolledOn: string;
  endedOn: string | null;
  reason?: string | null;
}

export interface Teacher {
  id: string;
  staffNumber: string;
  name: string;
  status: 'active' | 'inactive';
  userId: string | null;
  email: string | null;
}

export interface Guardian {
  id: string;
  parentId: string;
  name: string;
  relationship: string;
  isPrimary: boolean;
  phone: string | null;
  email: string | null;
}

/* ---- 7.6 attendance ---- */

export type AttendanceMark = 'present' | 'absent' | 'late';

export interface RosterRow {
  enrolmentId: string;
  studentId: string;
  name: string;
  admissionNumber: string;
}

export interface RegisterRecordRow {
  enrolmentId: string;
  status: AttendanceMark;
}

export interface Register {
  id: string;
  teachingAssignmentId: string;
  date: string;
  periodNo: number;
  status: 'draft' | 'submitted';
  present: number;
  absent: number;
  late: number;
  total: number;
  /** present on GET; omitted on the PUT response per the contract sample */
  records?: RegisterRecordRow[];
}

export interface StudentAttendance {
  summary: { present: number; absent: number; late: number; total: number };
  records: { date: string; status: AttendanceMark }[];
}

/* ---- 7.7 assessments and results ---- */

export type ResultStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'published'
  | 'correction_pending';

export interface Assessment {
  id: string;
  teachingAssignmentId: string;
  termId: string;
  name: string;
  type: string;
  maximumScore: number;
  weight: number;
}

/**
 * One row of the score sheet. The contract says the endpoint returns "rows
 * keyed by enrolment, including empty ones for the roster", so the row carries
 * the roster identity plus the score that may not exist yet. DERIVED.
 */
export interface ScoreRow {
  enrolmentId: string;
  resultId: string | null;
  student: { id: string; name: string; admissionNumber: string };
  score: number | null;
  status: ResultStatus | null;
}

export interface RevisionNote {
  previousScore: number;
  newScore: number;
  reason: string;
  decidedAt: string;
}

export interface ReportCardSubject {
  subject: string;
  assessments: { name: string; score: number | null; max: number }[];
  /** computed by the API — never recomputed in the browser */
  total: number;
  grade: string;
  revised: boolean;
  revision?: RevisionNote;
}

/** Shape printed verbatim in the contract sample (table 37). */
export interface ReportCard {
  student: { name: string; admissionNumber: string };
  class: string;
  term: string;
  session: string;
  subjects: ReportCardSubject[];
  /** null when the card exists but nothing is published; omitted when the shape has no such field (e.g. /me/results). */
  publishedAt?: string | null;
}

export interface CorrectionResult {
  resultId: string;
  status: ResultStatus;
  previousScore: number;
  newScore: number;
  requestedBy: string;
  requiresApproval: boolean;
}

/** GET /me/results — published results grouped by term, per child. DERIVED. */
export interface MeResultGroup {
  student: { id: string; name: string; admissionNumber: string };
  terms: {
    termId: string;
    term: string;
    session: string;
    subjects: ReportCardSubject[];
  }[];
}

/* ---- filters ---- */

export interface StudentFilters {
  q?: string;
  classId?: string;
  sessionId?: string;
  status?: StudentStatus;
  page?: number;
  pageSize?: number;
}
