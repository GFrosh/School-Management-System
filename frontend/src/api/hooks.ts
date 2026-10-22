/**
 * TanStack Query hooks. Keys mirror the contract's resource paths so a mutation
 * invalidates precisely what it changed — no global refetch storm.
 */
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import * as api from './endpoints';
import type { StudentFilters } from './types';
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

export const qk = {
  me: ['me'] as const,
  sessions: (current?: boolean) => ['sessions', current ?? 'all'] as const,
  terms: (sessionId: string) => ['terms', sessionId] as const,
  classes: ['classes'] as const,
  subjects: ['subjects'] as const,
  assignments: (filters: Record<string, string | undefined>) => ['assignments', filters] as const,
  roster: (assignmentId: string) => ['assignment', assignmentId, 'roster'] as const,
  students: (filters: StudentFilters) => ['students', filters] as const,
  student: (id: string) => ['student', id] as const,
  enrolments: (id: string) => ['student', id, 'enrolments'] as const,
  teachers: ['teachers'] as const,
  guardians: (id: string) => ['student', id, 'guardians'] as const,
  register: (assignmentId: string, date: string, period: number) =>
    ['register', assignmentId, date, period] as const,
  attendance: (studentId: string) => ['attendance', studentId] as const,
  assessments: (filters: Record<string, string | undefined>) => ['assessments', filters] as const,
  scores: (assessmentId: string) => ['scores', assessmentId] as const,
  reportCard: (enrolmentId: string, termId: string) => ['reportCard', enrolmentId, termId] as const,
  myResults: ['me', 'results'] as const,
};

/* ---- structure ---- */
export const useSessions = (current?: boolean) =>
  useQuery({ queryKey: qk.sessions(current), queryFn: () => api.fetchSessions(current) });

export const useTerms = (sessionId: string | undefined) =>
  useQuery({ queryKey: qk.terms(sessionId ?? ''), queryFn: () => api.fetchTerms(sessionId!), enabled: Boolean(sessionId) });

export const useClasses = () => useQuery({ queryKey: qk.classes, queryFn: api.fetchClasses });
export const useSubjects = () => useQuery({ queryKey: qk.subjects, queryFn: api.fetchSubjects });

export const useCreateSession = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SessionCreateValues) => api.createSession(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  });
};

export const useSetCurrentSession = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patchSession(id, { isCurrent: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  });
};

export const useCreateTerm = (sessionId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: TermCreateValues) => api.createTerm(sessionId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.terms(sessionId) }),
  });
};

export const useCreateClass = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ClassCreateValues) => api.createClass(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.classes }),
  });
};

export const useCreateSubject = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SubjectCreateValues) => api.createSubject(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.subjects }),
  });
};

export const useAssignments = (filters: { termId?: string; classId?: string } = {}) =>
  useQuery({
    queryKey: qk.assignments({ termId: filters.termId, classId: filters.classId }),
    queryFn: () => api.fetchAssignments(filters),
  });

export const useCreateAssignment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AssignmentCreateValues) => api.createAssignment(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assignments'] }),
  });
};

export const useDeleteAssignment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteAssignment(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assignments'] }),
  });
};

export const useRoster = (assignmentId: string | undefined) =>
  useQuery({
    queryKey: qk.roster(assignmentId ?? ''),
    queryFn: () => api.fetchRoster(assignmentId!),
    enabled: Boolean(assignmentId),
  });

/* ---- people ---- */
export const useStudents = (filters: StudentFilters) =>
  useQuery({
    queryKey: qk.students(filters),
    queryFn: () => api.fetchStudents(filters),
    placeholderData: keepPreviousData,
  });

export const useStudent = (id: string | undefined) =>
  useQuery({ queryKey: qk.student(id ?? ''), queryFn: () => api.fetchStudent(id!), enabled: Boolean(id) });

export const useCreateStudent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: StudentCreateValues) => api.createStudent(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }),
  });
};

export const usePatchStudent = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: StudentUpdateValues) => api.patchStudent(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.student(id) });
      qc.invalidateQueries({ queryKey: ['students'] });
    },
  });
};

export const useEnrolments = (studentId: string | undefined) =>
  useQuery({
    queryKey: qk.enrolments(studentId ?? ''),
    queryFn: () => api.fetchEnrolments(studentId!),
    enabled: Boolean(studentId),
  });

export const useCreateEnrolment = (studentId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: EnrolmentCreateValues) => api.createEnrolment(studentId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.enrolments(studentId) });
      qc.invalidateQueries({ queryKey: qk.student(studentId) });
    },
  });
};

export const useCloseEnrolment = (studentId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { enrolmentId: string; body: EnrolmentCloseValues }) =>
      api.closeEnrolment(vars.enrolmentId, vars.body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.enrolments(studentId) }),
  });
};

export const useTeachers = (enabled = true) =>
  useQuery({ queryKey: qk.teachers, queryFn: api.fetchTeachers, enabled });

export const useCreateTeacher = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; staffNumber: string }) => api.createTeacher(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.teachers }),
  });
};

export const useGuardians = (studentId: string | undefined) =>
  useQuery({
    queryKey: qk.guardians(studentId ?? ''),
    queryFn: () => api.fetchGuardians(studentId!),
    enabled: Boolean(studentId),
  });

export const useLinkGuardian = (studentId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: GuardianLinkValues) => api.linkGuardian(studentId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.guardians(studentId) }),
  });
};

export const useUnlinkGuardian = (studentId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (parentId: string) => api.unlinkGuardian(studentId, parentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.guardians(studentId) }),
  });
};

/* ---- attendance ---- */
export const useRegister = (assignmentId: string, date: string, periodNo: number, enabled: boolean) =>
  useQuery({
    queryKey: qk.register(assignmentId, date, periodNo),
    queryFn: () => api.fetchRegister(assignmentId, date, periodNo),
    enabled,
    retry: false,
  });

export const useSaveRegister = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.saveRegister,
    onSuccess: (res) => {
      qc.setQueryData(qk.register(res.data.teachingAssignmentId, res.data.date, res.data.periodNo), res);
    },
  });
};

export const useSubmitRegister = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.submitRegister(id),
    onSuccess: (res) => {
      qc.invalidateQueries({
        queryKey: qk.register(res.data.teachingAssignmentId, res.data.date, res.data.periodNo),
      });
    },
  });
};

export const useStudentAttendance = (studentId: string | undefined) =>
  useQuery({
    queryKey: qk.attendance(studentId ?? ''),
    queryFn: () => api.fetchStudentAttendance(studentId!),
    enabled: Boolean(studentId),
  });

/* ---- results ---- */
export const useAssessments = (filters: { teachingAssignmentId?: string; termId?: string }) =>
  useQuery({
    queryKey: qk.assessments({ teachingAssignmentId: filters.teachingAssignmentId, termId: filters.termId }),
    queryFn: () => api.fetchAssessments(filters),
  });

export const useAssessmentLookup = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      teachingAssignmentId: string;
      termId?: string;
      name: string;
      type: string;
      maximumScore: number;
      weight: number;
    }) => api.createAssessment(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assessments'] }),
  });
};

export const useScores = (assessmentId: string | undefined) =>
  useQuery({
    queryKey: qk.scores(assessmentId ?? ''),
    queryFn: () => api.fetchScores(assessmentId!),
    enabled: Boolean(assessmentId),
  });

export const useSaveScores = (assessmentId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (scores: { enrolmentId: string; score: number | null }[]) => api.saveScores(assessmentId, scores),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.scores(assessmentId) }),
  });
};

export const useAssessmentTransition = (action: 'submit' | 'approve' | 'publish') => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assessmentId: string) => {
      if (action === 'submit') return api.submitAssessment(assessmentId);
      if (action === 'approve') return api.approveAssessment(assessmentId);
      return api.publishAssessment(assessmentId);
    },
    onSuccess: (_res, assessmentId) => {
      qc.invalidateQueries({ queryKey: qk.scores(assessmentId) });
      qc.invalidateQueries({ queryKey: ['assessments'] });
      qc.invalidateQueries({ queryKey: qk.myResults });
    },
  });
};

export const useRequestCorrection = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { resultId: string; body: { newScore: number; reason: string } }) =>
      api.requestCorrection(vars.resultId, vars.body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['scores'] }),
  });
};

export const useApproveCorrection = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { resultId: string; correctionId: string }) =>
      api.approveCorrection(vars.resultId, vars.correctionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['scores'] }),
  });
};

export const useReportCard = (enrolmentId: string | undefined, termId: string | undefined) =>
  useQuery({
    queryKey: qk.reportCard(enrolmentId ?? '', termId ?? ''),
    queryFn: () => api.fetchReportCard(enrolmentId!, termId!),
    enabled: Boolean(enrolmentId && termId),
    retry: false,
  });

export const useMyResults = () =>
  useQuery({ queryKey: qk.myResults, queryFn: api.fetchMyResults, retry: false });
