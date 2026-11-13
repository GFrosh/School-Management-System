const ApiResponse = require("../utils/Response");
const SubjectRepository = require("../repositories/subject.repository");
const AssignmentRepository = require("../repositories/assignment.repository");
const GuardianRepository = require("../repositories/guardian.repository");
const TeacherRepository = require("../repositories/teacher.repository");
const Phase2Repository = require("../repositories/phase2.repository");

const subjects = new SubjectRepository();
const assignments = new AssignmentRepository();
const guardians = new GuardianRepository();
const teacherRepo = new TeacherRepository();
const repo = new Phase2Repository();

const teacherIdFor = async (user) => {
  if (!user?.roles?.includes("teacher") || user.roles.includes("admin")) return null;
  const teacher = await teacherRepo.getByUserId(user.sub);
  if (!teacher) throw ApiResponse.error(403, "FORBIDDEN", "Teacher profile is not linked to this account");
  return teacher.id;
};
const requireRow = (row, label) => {
  if (!row) throw ApiResponse.error(404, "NOT_FOUND", `${label} not found`);
  return row;
};

module.exports = {
  listSubjects: () => subjects.list(),
  createSubject: (data) => subjects.create(data),
  deleteSubject: (id) => subjects.remove(id),
  listAssignments: async (user, filters) => assignments.list(await teacherIdFor(user), filters),
  createAssignment: (data) => assignments.create(data),
  deleteAssignment: (id) => assignments.remove(id),
  roster: async (id, user) => {
    const teacherId = await teacherIdFor(user);
    const query = assignments.roster(id);
    return teacherId ? query.where("ta.teacher_id", teacherId) : query;
  },
  listTeachers: () => repo.listTeachers(),
  createTeacher: (data) => repo.createTeacher(data),
  updateTeacher: (id, data) => repo.updateTeacher(id, data).then(r => requireRow(r, "Teacher")),
  createStudent: (data) => repo.createStudent(data),
  updateStudent: (id, data) => repo.updateStudent(id, data).then(r => requireRow(r, "Student")),
  createEnrolment: (data) => repo.createEnrolment(data),
  closeEnrolment: (id, data) => repo.closeEnrolment(id, { ...data, ended_on: data.ended_on || new Date(), status: data.status || "withdrawn" }).then(r => requireRow(r, "Enrolment")),
  listGuardians: (id) => guardians.list(id),
  linkGuardian: (id, data) => guardians.link(id, data),
  unlinkGuardian: (id, parentId) => guardians.unlink(id, parentId),
  updateUserStatus: async (id, status) => {
    const changed = await repo.updateUserStatus(id, status);
    if (!changed) throw ApiResponse.error(404, "NOT_FOUND", "User not found");
    return { id, status };
  },
  listPromotions: (sessionId) => repo.listPromotions(sessionId),
  promote: async (data) => {
    if (!data.decisions) return repo.promote({ ...data, enrolled_on: data.enrolled_on || new Date() });
    return repo.promoteDecisions(data.session_id || data.sessionId, data.decisions);
  },
};
