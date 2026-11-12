const ApiResponse = require("../utils/Response");
const service = require("../services/phase2.service");
const ok = (fn, status = 200) => async (req, res) => ApiResponse.success(res, await fn(req), null, status);

module.exports = {
  listSubjects: ok(() => service.listSubjects()),
  createSubject: ok(req => service.createSubject({ code: req.body.code, name: req.body.name, is_core: req.body.is_core ?? req.body.isCore }), 201),
  deleteSubject: ok(async req => { await service.deleteSubject(req.params.id); return { deleted: true }; }),
  listAssignments: ok(req => service.listAssignments(req.user, req.query)),
  createAssignment: ok(req => service.createAssignment({
    teacher_id: req.body.teacher_id || req.body.teacherId, class_id: req.body.class_id || req.body.classId,
    subject_id: req.body.subject_id || req.body.subjectId, term_id: req.body.term_id || req.body.termId,
    is_primary: req.body.is_primary ?? req.body.isPrimary,
  }), 201),
  deleteAssignment: ok(async req => { await service.deleteAssignment(req.params.id); return { deleted: true }; }),
  roster: ok(req => service.roster(req.params.id, req.user)),
  listTeachers: ok(() => service.listTeachers()),
  createTeacher: ok(req => service.createTeacher({
    first_name: req.body.first_name || req.body.name?.split(" ")[0],
    last_name: req.body.last_name || req.body.name?.split(" ").slice(1).join(" "),
    staff_number: req.body.staff_number || req.body.staffNumber,
    middle_name: req.body.middle_name, employment_date: req.body.employment_date,
    status: req.body.status, user_id: req.body.user_id,
  }), 201),
  updateTeacher: ok(req => service.updateTeacher(req.params.id, {
    first_name: req.body.first_name, middle_name: req.body.middle_name,
    last_name: req.body.last_name, staff_number: req.body.staff_number,
    employment_date: req.body.employment_date, status: req.body.status, user_id: req.body.user_id,
  })),
  createStudent: ok(req => service.createStudent({
    first_name: req.body.first_name || req.body.name?.split(" ")[0],
    last_name: req.body.last_name || req.body.name?.split(" ").slice(1).join(" "),
    admission_number: req.body.admission_number || req.body.admissionNumber,
    date_of_birth: req.body.date_of_birth || req.body.dateOfBirth,
    middle_name: req.body.middle_name, gender: req.body.gender, admission_date: req.body.admission_date,
    status: req.body.status, user_id: req.body.user_id,
  }), 201),
  updateStudent: ok(req => service.updateStudent(req.params.id, {
    first_name: req.body.first_name || req.body.name?.split(" ")[0],
    last_name: req.body.last_name || req.body.name?.split(" ").slice(1).join(" "),
    admission_number: req.body.admission_number || req.body.admissionNumber,
    date_of_birth: req.body.date_of_birth || req.body.dateOfBirth,
    middle_name: req.body.middle_name, gender: req.body.gender, admission_date: req.body.admission_date,
    status: req.body.status, user_id: req.body.user_id,
  })),
  createEnrolment: ok(req => service.createEnrolment({
    student_id: req.params.id || req.body.student_id,
    class_id: req.body.class_id || req.body.classId, session_id: req.body.session_id || req.body.sessionId,
    enrolled_on: req.body.enrolled_on || req.body.enrolledOn,
    status: req.body.status,
  }), 201),
  closeEnrolment: ok(req => service.closeEnrolment(req.params.enrolmentId || req.params.id, {
    ...req.body, ended_on: req.body.ended_on || req.body.endedOn,
  })),
  listGuardians: ok(req => service.listGuardians(req.params.id)),
  linkGuardian: ok(req => service.linkGuardian(req.params.id, {
    parent_id: req.body.parent_id || req.body.parentId,
    relationship: req.body.relationship, is_primary: req.body.is_primary ?? req.body.isPrimary,
  }), 201),
  unlinkGuardian: ok(async req => { await service.unlinkGuardian(req.params.id, req.params.parentId); return { unlinked: true }; }),
  updateUserStatus: ok(req => service.updateUserStatus(req.params.id, req.body.status)),
  listPromotions: ok(req => service.listPromotions(req.params.sessionId)),
  promote: ok(req => service.promote({ ...req.body, session_id: req.params.id }), 201),
};
