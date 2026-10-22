/**
 * One function per endpoint in contract section 7. No endpoint is invented; the
 * path, method and body shape in each function come from the contract table it
 * is grouped under.
 */
import { apiRequest } from './client';
import type {
  AcademicSession,
  Assessment,
  Assignment,
  CorrectionResult,
  Enrolment,
  Guardian,
  Me,
  MeResultGroup,
  Register,
  ReportCard,
  RosterRow,
  SchoolClass,
  ScoreRow,
  Student,
  StudentAttendance,
  StudentFilters,
  Subject,
  Teacher,
  Term,
  Envelope,
  LoginResult,
  User,
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
  apiRequest<LoginResult>('/auth/login', { method: 'POST', body });
export const fetchMe = () => apiRequest<Me>('/auth/me');
export const logout = () => apiRequest<{ loggedOut: boolean }>('/auth/logout', { method: 'POST' });
export const changePassword = (body: { currentPassword: string; newPassword: string }) =>
  apiRequest<{ changed: boolean }>('/auth/password', { method: 'POST', body });

/* 7.4 academic structure */
export const fetchSessions = (current?: boolean) =>
  apiRequest<AcademicSession[]>('/sessions', { query: current ? { current: true } : undefined });
export const createSession = (body: SessionCreateValues) =>
  apiRequest<AcademicSession>('/sessions', { method: 'POST', body });
export const patchSession = (id: string, body: { name?: string; isCurrent?: boolean }) =>
  apiRequest<AcademicSession>(`/sessions/${id}`, { method: 'PATCH', body });
export const fetchTerms = (sessionId: string) =>
  apiRequest<Term[]>(`/sessions/${sessionId}/terms`);
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

export const fetchClasses = () => apiRequest<SchoolClass[]>('/classes');
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
export const fetchRoster = (assignmentId: string) =>
  apiRequest<RosterRow[]>(`/teaching-assignments/${assignmentId}/roster`);

/* 7.5 students, staff, guardians */
export const fetchStudents = (filters: StudentFilters) =>
  apiRequest<Student[]>('/students', {
    query: {
      q: filters.q,
      classId: filters.classId,
      sessionId: filters.sessionId,
      status: filters.status,
      page: filters.page ?? 1,
      pageSize: filters.pageSize ?? 25,
    },
  });
export const fetchStudent = (id: string) => apiRequest<Student>(`/students/${id}`);
export const createStudent = (body: StudentCreateValues) =>
  apiRequest<Student>('/students', { method: 'POST', body });
export const patchStudent = (id: string, body: StudentUpdateValues) =>
  apiRequest<Student>(`/students/${id}`, {
    method: 'PATCH',
    body: { name: body.name, dateOfBirth: body.dateOfBirth, status: body.status },
  });
export const fetchEnrolments = (studentId: string) =>
  apiRequest<Enrolment[]>(`/students/${studentId}/enrolments`);
export const createEnrolment = (studentId: string, body: EnrolmentCreateValues) =>
  apiRequest<Enrolment>(`/students/${studentId}/enrolments`, { method: 'POST', body });
export const closeEnrolment = (enrolmentId: string, body: EnrolmentCloseValues) =>
  apiRequest<Enrolment>(`/enrolments/${enrolmentId}`, { method: 'PATCH', body });
export const fetchTeachers = () => apiRequest<Teacher[]>('/teachers');
export const createTeacher = (body: { name: string; staffNumber: string }) =>
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
  apiRequest<Register>('/attendance-registers', {
    query: { teachingAssignmentId: assignmentId, date, periodNo },
  });
export const saveRegister = (body: {
  teachingAssignmentId: string;
  date: string;
  periodNo: number;
  status: 'draft';
  records: { enrolmentId: string; status: 'present' | 'absent' | 'late' }[];
}) => apiRequest<Register>('/attendance-registers', { method: 'PUT', body });
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
