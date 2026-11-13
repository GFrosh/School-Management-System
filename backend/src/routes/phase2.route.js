const { Router } = require("express");
const validate = require("../middlewares/validateSchema");
const asyncHandler = require("../middlewares/asyncHandler");
const requireRoles = require("../middlewares/requireRoles");
const { authenticateToken } = require("../middlewares/authenticateToken");
const schemas = require("../schemas/phase2.schema");
const c = require("../controllers/phase2.controller");

const router = Router();
const auth = [authenticateToken];
const admin = [authenticateToken, requireRoles("admin")];

const subject = Router();
subject.get("/", ...auth, requireRoles("*"), asyncHandler(c.listSubjects));
subject.post("/", ...admin, validate(schemas.SubjectSchema), asyncHandler(c.createSubject));
subject.delete("/:id", ...admin, asyncHandler(c.deleteSubject));

const assignment = Router();
assignment.get("/", ...auth, requireRoles(["admin", "teacher"]), asyncHandler(c.listAssignments));
assignment.post("/", ...admin, validate(schemas.AssignmentSchema), asyncHandler(c.createAssignment));
assignment.delete("/:id", ...admin, asyncHandler(c.deleteAssignment));

const teacher = Router();
teacher.get("/", ...admin, asyncHandler(c.listTeachers));
teacher.post("/", ...admin, validate(schemas.TeacherSchema), asyncHandler(c.createTeacher));
teacher.patch("/:id", ...admin, validate(schemas.UpdateTeacherSchema), asyncHandler(c.updateTeacher));

const guardian = Router();
guardian.get("/:id/guardians", ...admin, asyncHandler(c.listGuardians));
guardian.post("/:id/guardians", ...admin, validate(schemas.GuardianSchema), asyncHandler(c.linkGuardian));
guardian.delete("/:id/guardians/:parentId", ...admin, asyncHandler(c.unlinkGuardian));

const enrolment = Router();
enrolment.patch("/:id", ...admin, validate(schemas.CloseEnrolmentSchema), asyncHandler(c.closeEnrolment));

module.exports = { subject, assignment, teacher, guardian, enrolment };
