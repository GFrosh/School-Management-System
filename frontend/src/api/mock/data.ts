/**
 * Mock fixtures for every endpoint in contract section 7.
 * This file is the *server side* of the mock: it is allowed to compute totals,
 * grades and positions, because the real API does too. The browser never does.
 */
import type {
  AcademicSession,
  Assessment,
  Assignment,
  AttendanceMark,
  Guardian,
  RegisterRecordRow,
  ResultStatus,
  SchoolClass,
  Student,
  Subject,
  Teacher,
  Term,
  User,
} from '../types';

export interface MockResult {
  id: string;
  assessmentId: string;
  enrolmentId: string;
  score: number | null;
  status: ResultStatus;
  enteredBy: string | null;
  publishedAt: string | null;
  revisions: { previousScore: number; newScore: number; reason: string; decidedAt: string }[];
}

export interface MockRegister {
  id: string;
  teachingAssignmentId: string;
  date: string;
  periodNo: number;
  status: 'draft' | 'submitted';
  records: RegisterRecordRow[];
}

export interface MockState {
  users: (User & { password: string })[];
  students: Student[];
  teachers: Teacher[];
  parents: { id: string; name: string; email: string; phone: string; userId: string | null }[];
  guardians: (Guardian & { studentId: string })[];
  pendingCorrections: {
    id: string;
    resultId: string;
    previousScore: number;
    newScore: number;
    reason: string;
    requestedBy: string;
    status: 'pending';
  }[];
  sessions: AcademicSession[];
  terms: Term[];
  classes: SchoolClass[];
  subjects: Subject[];
  assignments: Assignment[];
  assessments: Assessment[];
  results: MockResult[];
  registers: MockRegister[];
  enrolments: {
    id: string;
    studentId: string;
    classId: string;
    sessionId: string;
    status: string;
    enrolledOn: string;
    endedOn: string | null;
    reason?: string | null;
  }[];
}

const SURNAMES = [
  'Nwosu', 'Okafor', 'Adeyemi', 'Bello', 'Eze', 'Ibrahim', 'Obi', 'Chukwu', 'Adebayo', 'Musa',
  'Okonkwo', 'Balogun', 'Nwachukwu', 'Sani', 'Ogunleye', 'Aliyu', 'Umeh', 'Afolabi', 'Danjuma', 'Iheanacho',
];
const FIRST = [
  'Chidi', 'Amaka', 'Tunde', 'Ngozi', 'Emeka', 'Fatima', 'Ifeoma', 'Yusuf', 'Bola', 'Chinwe',
  'Segun', 'Zainab', 'Obinna', 'Halima', 'Kelechi', 'Ada', 'Musa', 'Folake', 'Ike', 'Nneka',
];

function name(i: number): string {
  return `${FIRST[i % FIRST.length]} ${SURNAMES[(i * 3 + 1) % SURNAMES.length]}`;
}

function pad(n: number, width = 3): string {
  return String(n).padStart(width, '0');
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const sessionId = '9f8c0000-0000-4000-8000-000000000001';
const termIds = [
  '77e20000-0000-4000-8000-000000000001',
  '77e20000-0000-4000-8000-000000000002',
  '77e20000-0000-4000-8000-000000000003',
];
const classIds = {
  JSS1A: 'aa310000-0000-4000-8000-000000000001',
  JSS2A: 'aa310000-0000-4000-8000-000000000002',
  SS2A: 'aa310000-0000-4000-8000-000000000003',
  SSS3B: 'aa310000-0000-4000-8000-000000000004',
};
const subjectIds = {
  MTH: '5c090000-0000-4000-8000-000000000001',
  ENG: '5c090000-0000-4000-8000-000000000002',
  PHY: '5c090000-0000-4000-8000-000000000003',
  CHM: '5c090000-0000-4000-8000-000000000004',
  BIO: '5c090000-0000-4000-8000-000000000005',
};
const teacherIds = [
  '1b7f0000-0000-4000-8000-000000000001',
  '1b7f0000-0000-4000-8000-000000000002',
  '1b7f0000-0000-4000-8000-000000000003',
  '1b7f0000-0000-4000-8000-000000000004',
  '1b7f0000-0000-4000-8000-000000000005',
  '1b7f0000-0000-4000-8000-000000000006',
];

/* ---- users ---- */

const users: (User & { password: string })[] = [
  {
    id: '6c1e0000-0000-4000-8000-00000000000a',
    email: 'admin@school.edu.ng',
    displayName: 'Mrs. Adaeze Balogun',
    roles: ['admin'],
    profiles: { teacherId: null, parentId: null, studentId: null },
    password: 'Password123!',
  },
  {
    id: '6c1e0000-0000-4000-8000-00000000000b',
    email: 't.okafor@school.edu.ng',
    displayName: 'Tunde Okafor',
    roles: ['teacher', 'parent'],
    profiles: { teacherId: teacherIds[0] ?? null, parentId: '9d020000-0000-4000-8000-000000000001', studentId: null },
    password: 'Password123!',
  },
  {
    id: '6c1e0000-0000-4000-8000-00000000000c',
    email: 'chidi.nwosu@student.school.edu.ng',
    displayName: 'Chidi Nwosu',
    roles: ['student'],
    profiles: { teacherId: null, parentId: null, studentId: null },
    password: 'Password123!',
  },
  {
    id: '6c1e0000-0000-4000-8000-00000000000d',
    email: 'm.nwosu@gmail.com',
    displayName: 'Mr. Godwin Nwosu',
    roles: ['parent'],
    profiles: { teacherId: null, parentId: '9d020000-0000-4000-8000-000000000002', studentId: null },
    password: 'Password123!',
  },
];

/* ---- structure ---- */

const sessions: AcademicSession[] = [
  {
    id: sessionId,
    name: '2026/2027',
    startDate: '2026-09-07',
    endDate: '2027-07-16',
    isCurrent: true,
  },
  {
    id: '9f8c0000-0000-4000-8000-000000000000',
    name: '2025/2026',
    startDate: '2025-09-08',
    endDate: '2026-07-10',
    isCurrent: false,
  },
];

const terms: Term[] = [
  { id: termIds[0]!, sessionId, sequence: 1, name: 'First Term', startDate: '2026-09-07', endDate: '2026-12-11' },
  { id: termIds[1]!, sessionId, sequence: 2, name: 'Second Term', startDate: '2027-01-11', endDate: '2027-04-02' },
  { id: termIds[2]!, sessionId, sequence: 3, name: 'Third Term', startDate: '2027-04-19', endDate: '2027-07-16' },
];

const classes: SchoolClass[] = [
  { id: classIds.JSS1A, name: 'JSS1A', level: 'Junior Secondary 1', classTeacher: { id: teacherIds[2]!, name: 'Ifeoma Eze' }, headcount: 8 },
  { id: classIds.JSS2A, name: 'JSS2A', level: 'Junior Secondary 2', classTeacher: { id: teacherIds[3]!, name: 'Yusuf Sani' }, headcount: 6 },
  { id: classIds.SS2A, name: 'SS2A', level: 'Senior Secondary 2', classTeacher: { id: teacherIds[0]!, name: 'Tunde Okafor' }, headcount: 45 },
  { id: classIds.SSS3B, name: 'SSS3B', level: 'Senior Secondary 3', classTeacher: null, headcount: 0 },
];

const subjects: Subject[] = [
  { id: subjectIds.MTH, code: 'MTH', name: 'Mathematics', isCore: true },
  { id: subjectIds.ENG, code: 'ENG', name: 'English Language', isCore: true },
  { id: subjectIds.PHY, code: 'PHY', name: 'Physics', isCore: false },
  { id: subjectIds.CHM, code: 'CHM', name: 'Chemistry', isCore: false },
  { id: subjectIds.BIO, code: 'BIO', name: 'Biology', isCore: false },
];

const teachers: Teacher[] = [
  { id: teacherIds[0]!, staffNumber: 'STF/2019/004', name: 'Tunde Okafor', status: 'active', userId: '6c1e0000-0000-4000-8000-00000000000b', email: 't.okafor@school.edu.ng' },
  { id: teacherIds[1]!, staffNumber: 'STF/2020/011', name: 'Amaka Obi', status: 'active', userId: null, email: null },
  { id: teacherIds[2]!, staffNumber: 'STF/2017/002', name: 'Ifeoma Eze', status: 'active', userId: null, email: null },
  { id: teacherIds[3]!, staffNumber: 'STF/2021/018', name: 'Yusuf Sani', status: 'active', userId: null, email: null },
  { id: teacherIds[4]!, staffNumber: 'STF/2015/001', name: 'Bola Ogundipe', status: 'active', userId: null, email: null },
  { id: teacherIds[5]!, staffNumber: 'STF/2022/026', name: 'Halima Danjuma', status: 'inactive', userId: null, email: null },
];

const assignments: Assignment[] = [
  {
    id: 'e4100000-0000-4000-8000-000000000001',
    teacher: { id: teacherIds[0]!, name: 'Tunde Okafor' },
    class: { id: classIds.SS2A, name: 'SS2A' },
    subject: { id: subjectIds.MTH, name: 'Mathematics' },
    term: { id: termIds[0]!, name: 'First Term' },
    isPrimary: true,
  },
  {
    id: 'e4100000-0000-4000-8000-000000000002',
    teacher: { id: teacherIds[0]!, name: 'Tunde Okafor' },
    class: { id: classIds.SS2A, name: 'SS2A' },
    subject: { id: subjectIds.PHY, name: 'Physics' },
    term: { id: termIds[0]!, name: 'First Term' },
    isPrimary: true,
  },
  {
    id: 'e4100000-0000-4000-8000-000000000003',
    teacher: { id: teacherIds[1]!, name: 'Amaka Obi' },
    class: { id: classIds.SS2A, name: 'SS2A' },
    subject: { id: subjectIds.ENG, name: 'English Language' },
    term: { id: termIds[0]!, name: 'First Term' },
    isPrimary: true,
  },
  {
    id: 'e4100000-0000-4000-8000-000000000004',
    teacher: { id: teacherIds[1]!, name: 'Amaka Obi' },
    class: { id: classIds.JSS1A, name: 'JSS1A' },
    subject: { id: subjectIds.ENG, name: 'English Language' },
    term: { id: termIds[0]!, name: 'First Term' },
    isPrimary: true,
  },
];

/* ---- people ---- */

const SS2_SIZE = 45;

const ss2Students: Student[] = Array.from({ length: SS2_SIZE }, (_, i) => ({
  id: `s00${pad(i + 1, 3)}-0000-4000-8000-000000000000`,
  admissionNumber: `SMS/2025/${pad(i + 101, 4)}`,
  name: name(i),
  dateOfBirth: `2009-${pad((i % 12) + 1, 2)}-${pad((i % 27) + 1, 2)}`,
  status: 'active',
  userId: i === 0 ? '6c1e0000-0000-4000-8000-00000000000c' : null,
  currentPlacement: {
    enrolmentId: `en2${pad(i + 1, 3)}-0000-4000-8000-000000000000`,
    class: { id: classIds.SS2A, name: 'SS2A' },
    session: { id: sessionId, name: '2026/2027' },
    status: 'active',
    enrolledOn: '2026-09-07',
    endedOn: null,
  },
}));
// Chidi Nwosu is the demo student account, so pin the name the contract sample uses.
ss2Students[0] = {
  ...ss2Students[0]!,
  name: 'Chidi Nwosu',
  admissionNumber: 'SMS/2026/0142',
};

const juniorStudents: Student[] = Array.from({ length: 14 }, (_, i) => {
  const inJss1 = i < 8;
  const cls = inJss1 ? classes[0]! : classes[1]!;
  return {
    id: `s01${pad(i + 1, 3)}-0000-4000-8000-000000000000`,
    admissionNumber: `SMS/2026/${pad(i + 201, 4)}`,
    name: name(i + 25),
    dateOfBirth: `2012-${pad((i % 12) + 1, 2)}-${pad((i % 27) + 1, 2)}`,
    status: i === 13 ? 'inactive' : 'active',
    userId: null,
    currentPlacement: {
      enrolmentId: `en3${pad(i + 1, 3)}-0000-4000-8000-000000000000`,
      class: { id: cls.id, name: cls.name },
      session: { id: sessionId, name: '2026/2027' },
      status: 'active',
      enrolledOn: '2026-09-07',
      endedOn: null,
    },
  };
});

const students: Student[] = [...ss2Students, ...juniorStudents];

const enrolments = students.map((s) => ({
  id: s.currentPlacement!.enrolmentId,
  studentId: s.id,
  classId: s.currentPlacement!.class.id,
  sessionId,
  status: 'active',
  enrolledOn: s.currentPlacement!.enrolledOn,
  endedOn: null as string | null,
  reason: null as string | null,
}));

// One closed history row, so the student detail screen shows real history.
enrolments.push({
  id: 'en1999-0000-4000-8000-000000000000',
  studentId: ss2Students[0]!.id,
  classId: classIds.JSS1A,
  sessionId: '9f8c0000-0000-4000-8000-000000000000',
  status: 'promoted',
  enrolledOn: '2025-09-08',
  endedOn: '2026-07-10',
  reason: null,
});

const parents = [
  { id: '9d020000-0000-4000-8000-000000000001', name: 'Tunde Okafor', email: 't.okafor@school.edu.ng', phone: '0803 000 0001', userId: '6c1e0000-0000-4000-8000-00000000000b' },
  { id: '9d020000-0000-4000-8000-000000000002', name: 'Mr. Godwin Nwosu', email: 'm.nwosu@gmail.com', phone: '0806 555 0142', userId: '6c1e0000-0000-4000-8000-00000000000d' },
  { id: '9d020000-0000-4000-8000-000000000003', name: 'Mrs. Bisi Adeyemi', email: 'bisi.adeyemi@yahoo.com', phone: '0812 444 7788', userId: null },
];

const guardians: (Guardian & { studentId: string })[] = [
  {
    id: 'gd000000-0000-4000-8000-000000000001',
    studentId: 's00001-0000-4000-8000-000000000000',
    parentId: parents[1]!.id,
    name: parents[1]!.name,
    relationship: 'Father',
    isPrimary: true,
    phone: parents[1]!.phone,
    email: parents[1]!.email,
  },
  {
    id: 'gd000000-0000-4000-8000-000000000002',
    studentId: 's00006-0000-4000-8000-000000000000',
    parentId: parents[0]!.id,
    name: parents[0]!.name,
    relationship: 'Father',
    isPrimary: true,
    phone: parents[0]!.phone,
    email: parents[0]!.email,
  },
];

/* ---- assessments and results ---- */

const assessments: Assessment[] = [
  { id: 'as100000-0000-4000-8000-000000000001', teachingAssignmentId: assignments[0]!.id, termId: termIds[0]!, name: 'CA1', type: 'ca', maximumScore: 20, weight: 20 },
  { id: 'as100000-0000-4000-8000-000000000002', teachingAssignmentId: assignments[0]!.id, termId: termIds[0]!, name: 'CA2', type: 'ca', maximumScore: 20, weight: 20 },
  { id: 'as100000-0000-4000-8000-000000000003', teachingAssignmentId: assignments[0]!.id, termId: termIds[0]!, name: 'Exam', type: 'exam', maximumScore: 60, weight: 60 },
  { id: 'as100000-0000-4000-8000-000000000004', teachingAssignmentId: assignments[2]!.id, termId: termIds[0]!, name: 'CA1', type: 'ca', maximumScore: 20, weight: 20 },
  { id: 'as100000-0000-4000-8000-000000000005', teachingAssignmentId: assignments[2]!.id, termId: termIds[0]!, name: 'Exam', type: 'exam', maximumScore: 60, weight: 60 },
];

function scoreFor(seed: number, max: number): number {
  const pct = 42 + ((seed * 37) % 55); // 42%..96%, deterministic
  return Math.round((pct / 100) * max);
}

const results: MockResult[] = [];

for (let i = 0; i < SS2_SIZE; i += 1) {
  const student = ss2Students[i]!;
  const enrolmentId = student.currentPlacement!.enrolmentId;

  for (const assessment of assessments.slice(0, 3)) {
    const published = assessment.id !== assessments[2]!.id;
    results.push({
      id: `r9${pad(i + 1, 3)}${assessment.id.slice(-1)}-0000-4000-8000-000000000000`,
      assessmentId: assessment.id,
      enrolmentId,
      score: scoreFor(i + Number(assessment.id.slice(-1)), assessment.maximumScore),
      status: published ? 'published' : 'approved',
      enteredBy: '1b7f0000-0000-4000-8000-000000000001',
      publishedAt: published ? '2026-10-20T09:14:00Z' : null,
      revisions: [],
    });
  }

  // English CA1: approved but unpublished — the admin's "ready to publish" pile.
  results.push({
    id: `r9e${pad(i + 1, 3)}-0000-4000-8000-000000000000`,
    assessmentId: assessments[3]!.id,
    enrolmentId,
    score: scoreFor(i + 7, 20),
    status: 'approved',
    enteredBy: '1b7f0000-0000-4000-8000-000000000002',
    publishedAt: null,
    revisions: [],
  });
}

// One published score that was later revised (the "Revised" marker must be visible),
// and one correction still awaiting approval (published value must stand).
const firstResult = results.find((r) => r.assessmentId === assessments[1]!.id);
if (firstResult) {
  const previous = firstResult.score ?? 0;
  firstResult.score = Math.min(20, previous + 3);
  firstResult.revisions.push({
    previousScore: previous,
    newScore: firstResult.score,
    reason: 'Total was transcribed as a lower figure; marked script re-checked by the subject teacher.',
    decidedAt: '2026-10-21T11:05:00Z',
  });
}
const secondResult = results.filter((r) => r.assessmentId === assessments[0]!.id)[1];
if (secondResult) {
  secondResult.status = 'published';
}

/* ---- attendance ---- */

const registers: MockRegister[] = [
  {
    id: 'reg00000-0000-4000-8000-000000000001',
    teachingAssignmentId: assignments[0]!.id,
    date: '2026-10-12',
    periodNo: 3,
    status: 'submitted',
    records: ss2Students.map((s, i) => ({
      enrolmentId: s.currentPlacement!.enrolmentId,
      status: (i === 4 ? 'absent' : i === 9 ? 'late' : 'present') as AttendanceMark,
    })),
  },
  {
    id: 'reg00000-0000-4000-8000-000000000002',
    teachingAssignmentId: assignments[0]!.id,
    date: '2026-10-19',
    periodNo: 3,
    status: 'draft',
    records: ss2Students.map((s) => ({
      enrolmentId: s.currentPlacement!.enrolmentId,
      status: 'present' as AttendanceMark,
    })),
  },
];

const studentAccount = users.find((u) => u.roles.includes('student'));
if (studentAccount) studentAccount.profiles.studentId = ss2Students[0]!.id;

export const state: MockState = {
  users,
  students,
  teachers,
  parents,
  guardians,
  pendingCorrections: [],
  sessions,
  terms,
  classes,
  subjects,
  assignments,
  assessments,
  results,
  registers,
  enrolments,
};

/** Deterministic seed dates so the mock always has a plausible week of records. */
export const seedDates = {
  sessionStart: iso(new Date('2026-09-07T00:00:00Z')),
  today: iso(new Date()),
};
