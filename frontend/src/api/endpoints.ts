/**
 * One function per endpoint in contract section 7. No endpoint is invented; the
 * path, method and body shape in each function come from the contract table it
 * is grouped under.
 */
import { apiRequest } from './client';
import type {
  AcademicSession,
  SessionListItem,
  Assessment,
  Assignment,
  CorrectionResult,
  Enrolment,
  Guardian,
  MeResultGroup,
  Register,
  ReportCard,
  RosterRow,
  SchoolClass,
  ClassListItem,
  ScoreRow,
  Student,
  StudentListItem,
  StudentEnrolmentListItem,
  StudentAttendance,
  AttendanceMark,
  StudentFilters,
  Subject,
  Teacher,
  Term,
  TermListItem,
  Envelope,
  LoginResult,
  MeResponse,
  User,
  AccountProfile,
  CreatedUserAccount,
} from './types';
import type {
  AssignmentCreateValues,
  ClassCreateValues,
  EnrolmentCloseValues,
  EnrolmentCreateValues,
  GuardianLinkValues,
  SessionCreateValues,
  StudentCreateValues,
  StudentUpdateValues,
  SubjectCreateValues,
  TermCreateValues,
} from './contract';

/* 7.3 authentication */
export const login = (body: { email: string; password: string }) =>
  apiRequest<LoginResult>('/users/login', { method: 'POST', body });
export const fetchMe = () => apiRequest<MeResponse>('/users/me');
export const logout = () => apiRequest<{ loggedOut: boolean }>('/users/logout', { method: 'POST' });
export const changePassword = (body: { currentPassword: string; newPassword: string }) =>
  apiRequest<{ changed: boolean }>('/users/password', { method: 'POST', body });
export const fetchAccountProfiles = () => apiRequest<AccountProfile[]>('/users/profiles');
export const createUserFromProfile = (body: {
  profileType: AccountProfile['profileType'];
  profileId: string;
  email: string;
  password: string;
  systemRole?: 'admin' | 'teacher' | 'student' | 'parent';
}) => apiRequest<CreatedUserAccount>('/users/from-profile', { method: 'POST', body });

/* 7.4 academic structure */
export const fetchSessions = (current?: boolean) =>
  apiRequest<SessionListItem[]>('/sessions', { query: current ? { current: true } : undefined });
export const createSession = (body: SessionCreateValues) =>
  apiRequest<AcademicSession>('/sessions', { method: 'POST', body });
export const patchSession = (id: string, body: { name?: string; isCurrent?: boolean }) =>
  apiRequest<AcademicSession>(`/sessions/${id}`, { method: 'PATCH', body });
export const fetchTerms = (sessionId: string) =>
  apiRequest<TermListItem[]>(`/sessions/${sessionId}/terms`);
export const createTerm = (sessionId: string, body: TermCreateValues) =>
  apiRequest<Term>(`/sessions/${sessionId}/terms`, {
    method: 'POST',
    body: { ...body, sequence: Number(body.sequence) },
  });
export type PromotionDecision = {
  studentId: string;
  outcome: 'promoted' | 'repeated' | 'graduated';
  toClassId?: string;
};
export const promote = (sessionId: string, fromSessionId: string, decisions: PromotionDecision[]) =>
  apiRequest<{ sessionId: string; promoted: number; repeated: number; graduated: number; skipped: string[] }>(
    `/sessions/${sessionId}/promotions`,
    { method: 'POST', body: { fromSessionId, decisions } },
  );

export const fetchClasses = () => apiRequest<ClassListItem[]>('/classes');
export const createClass = (body: ClassCreateValues) =>
  apiRequest<SchoolClass>('/classes', { method: 'POST', body });
export const patchClass = (id: string, body: { name?: string; level?: string }) =>
  apiRequest<SchoolClass>(`/classes/${id}`, { method: 'PATCH', body });
export const fetchSubjects = () => apiRequest<Subject[]>('/subjects');
export const createSubject = (body: SubjectCreateValues) =>
  apiRequest<Subject>('/subjects', { method: 'POST', body });

export const fetchAssignments = (filters: { termId?: string; classId?: string } = {}) =>
  apiRequest<Assignment[]>('/teaching-assignments', { query: filters });
export const createAssignment = (body: AssignmentCreateValues) =>
  apiRequest<Assignment>('/teaching-assignments', { method: 'POST', body });
export const deleteAssignment = (id: string) =>
  apiRequest<{ id: string }>(`/teaching-assignments/${id}`, { method: 'DELETE' });
type RosterApiRow = {
  enrolment_id?: string;
  enrolmentId?: string;
  student_id?: string;
  studentId?: string;
  name: string;
  admission_number?: string;
  admissionNumber?: string;
};

export const fetchRoster = async (assignmentId: string) => {
  const response = await apiRequest<RosterApiRow[]>(`/teaching-assignments/${assignmentId}/roster`);
  return {
    ...response,
    data: response.data.map((row): RosterRow => ({
      enrolmentId: row.enrolmentId ?? row.enrolment_id ?? '',
      studentId: row.studentId ?? row.student_id ?? '',
      name: row.name,
      admissionNumber: row.admissionNumber ?? row.admission_number ?? '',
    })),
  };
};

type RegisterApiRow = {
  id: string | null;
  teachingAssignmentId?: string;
  teaching_assignment_id?: string;
  date?: string;
  attendance_date?: string;
  periodNo?: number;
  period_no?: number;
  status: Register['status'];
  present?: number;
  absent?: number;
  late?: number;
  total?: number;
  records?: Array<{ enrolmentId?: string; enrolment_id?: string; status: AttendanceMark | null }>;
};

const mapRegister = (row: RegisterApiRow): Register => ({
  id: row.id ?? '',
  teachingAssignmentId: row.teachingAssignmentId ?? row.teaching_assignment_id ?? '',
  date: row.date ?? row.attendance_date ?? '',
  periodNo: row.periodNo ?? row.period_no ?? 1,
  status: row.status,
  present: row.present ?? 0,
  absent: row.absent ?? 0,
  late: row.late ?? 0,
  total: row.total ?? 0,
  records: row.records?.map((record) => ({
    enrolmentId: record.enrolmentId ?? record.enrolment_id ?? '',
    status: record.status ?? null,
  })),
});

/* 7.5 students, staff, guardians */
export const fetchStudents = (filters: StudentFilters) =>
  apiRequest<StudentListItem[]>('/students', {
    query: {
      q: filters.q,
      classId: filters.classId,
      sessionId: filters.sessionId,
      status: filters.status,
      page: filters.page ?? 1,
      pageSize: filters.pageSize ?? 25,
    },
  });
export const fetchStudent = (id: string) => apiRequest<StudentListItem>(`/students/${id}`);
export const createStudent = (body: StudentCreateValues) =>
  apiRequest<Student>('/students', { method: 'POST', body });
export const patchStudent = (id: string, body: StudentUpdateValues) =>
  apiRequest<Student>(`/students/${id}`, {
    method: 'PATCH',
    body,
  });
export const fetchEnrolments = (studentId: string) =>
  apiRequest<StudentEnrolmentListItem[]>(`/students/${studentId}/enrolments`);
export const createEnrolment = (studentId: string, body: EnrolmentCreateValues) =>
  apiRequest<Enrolment>(`/students/${studentId}/enrolments`, { method: 'POST', body });
export const closeEnrolment = (enrolmentId: string, body: EnrolmentCloseValues) =>
  apiRequest<Enrolment>(`/enrolments/${enrolmentId}`, { method: 'PATCH', body });
type TeacherApiRow = {
  id: string;
  staff_number: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  status: 'active' | 'on_leave' | 'inactive';
  user_id: string | null;
  email?: string | null;
};

const mapTeacher = (row: TeacherApiRow): Teacher => ({
  id: row.id,
  staffNumber: row.staff_number,
  name: [row.first_name, row.middle_name, row.last_name].filter(Boolean).join(' '),
  status: row.status === 'active' ? 'active' : 'inactive',
  userId: row.user_id,
  email: row.email ?? null,
});

export const fetchTeachers = async () => {
  const response = await apiRequest<TeacherApiRow[]>('/teachers');
  return { ...response, data: response.data.map(mapTeacher) };
};
export const createTeacher = (body: { firstName: string; middleName?: string; lastName: string }) =>
  apiRequest<Teacher>('/teachers', { method: 'POST', body });
export const fetchGuardians = (studentId: string) =>
  apiRequest<Guardian[]>(`/students/${studentId}/guardians`);
export const linkGuardian = (studentId: string, body: GuardianLinkValues) =>
  apiRequest<Guardian>(`/students/${studentId}/guardians`, { method: 'POST', body });
export const unlinkGuardian = (studentId: string, parentId: string) =>
  apiRequest<{ unlinked: boolean }>(`/students/${studentId}/guardians/${parentId}`, { method: 'DELETE' });
export const setAccountStatus = (userId: string, status: 'active' | 'suspended') =>
  apiRequest<{ id: string; status: string; tokensRevoked: boolean }>(`/users/${userId}/status`, {
    method: 'PATCH',
    body: { status },
  });

/* 7.6 attendance */
export const fetchRegister = (assignmentId: string, date: string, periodNo: number) =>
  apiRequest<RegisterApiRow>('/attendance-registers', {
    query: { teachingAssignmentId: assignmentId, date, periodNo },
  }).then((response) => ({ ...response, data: mapRegister(response.data) }));
export const saveRegister = (body: {
  teachingAssignmentId: string;
  date: string;
  periodNo: number;
  status: 'draft';
  records: { enrolmentId: string; status: 'present' | 'absent' | 'late' }[];
}) => apiRequest<RegisterApiRow>('/attendance-registers', { method: 'PUT', body })
  .then((response) => ({ ...response, data: mapRegister(response.data) }));
export const submitRegister = (id: string) =>
  apiRequest<Register>(`/attendance-registers/${id}/submit`, { method: 'POST' });
export const fetchStudentAttendance = (studentId: string, range: { from?: string; to?: string } = {}) =>
  apiRequest<StudentAttendance>(`/students/${studentId}/attendance`, { query: range });

/* 7.7 assessments and results */
export const fetchAssessments = (filters: { teachingAssignmentId?: string; termId?: string }) =>
  apiRequest<Assessment[]>('/assessments', { query: filters });
export const createAssessment = (body: {
  teachingAssignmentId: string;
  termId?: string;
  name: string;
  type: string;
  maximumScore: number;
  weight: number;
}) => apiRequest<Assessment>('/assessments', { method: 'POST', body });
export const fetchScores = (assessmentId: string) =>
  apiRequest<ScoreRow[]>(`/assessments/${assessmentId}/scores`);
export const saveScores = (assessmentId: string, scores: { enrolmentId: string; score: number | null }[]) =>
  apiRequest<{ assessmentId: string; entered: number; total: number; status: string }>(
    `/assessments/${assessmentId}/scores`,
    { method: 'PUT', body: { scores } },
  );
export const submitAssessment = (assessmentId: string) =>
  apiRequest<{ assessmentId: string; status: string; count: number }>(`/assessments/${assessmentId}/submit`, {
    method: 'POST',
  });
export const approveAssessment = (assessmentId: string) =>
  apiRequest<{ assessmentId: string; status: string; count: number }>(`/assessments/${assessmentId}/approve`, {
    method: 'POST',
  });
export const publishAssessment = (assessmentId: string) =>
  apiRequest<{ assessmentId: string; status: string; count: number; publishedAt: string }>(
    `/assessments/${assessmentId}/publish`,
    { method: 'POST' },
  );
export const requestCorrection = (resultId: string, body: { newScore: number; reason: string }) =>
  apiRequest<CorrectionResult>(`/results/${resultId}/corrections`, { method: 'POST', body });
export const approveCorrection = (resultId: string, correctionId: string) =>
  apiRequest<CorrectionResult>(`/results/${resultId}/corrections/${correctionId}/approve`, { method: 'POST' });
export const fetchReportCard = (enrolmentId: string, termId: string) =>
  apiRequest<ReportCard>(`/enrolments/${enrolmentId}/report-card`, { query: { termId } });
export const fetchMyResults = () => apiRequest<MeResultGroup[]>('/me/results');

export type { User, Envelope };
