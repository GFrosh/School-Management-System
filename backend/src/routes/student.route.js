const { Router } = require("express");
const router = Router();


const validate = require("../middlewares/validateSchema");
const { GetStudentsQuerySchema } = require("../schemas/student.schema");
const { authenticateToken } = require("../middlewares/authenticateToken");
const requireRoles = require("../middlewares/requireRoles");
const asyncHandler = require("../middlewares/asyncHandler");
const { getStudents, getStudentById, getStudentEnrolments } = require("../controllers/student.controller");
const phase2 = require("../controllers/phase2.controller");
const { StudentSchema, UpdateStudentSchema, EnrolmentSchema, CloseEnrolmentSchema } = require("../schemas/phase2.schema");




router.get("/", authenticateToken, requireRoles(["admin", "teacher"]), validate(GetStudentsQuerySchema), asyncHandler(getStudents));
router.post("/", authenticateToken, requireRoles("admin"), validate(StudentSchema), asyncHandler(phase2.createStudent));
router.get("/:id", authenticateToken, requireRoles(["admin", "teacher"]), asyncHandler(getStudentById));
router.get("/:id/enrolments", authenticateToken, requireRoles(["admin", "teacher"]), asyncHandler(getStudentEnrolments));
router.post("/:id/enrolments", authenticateToken, requireRoles("admin"), validate(EnrolmentSchema), asyncHandler(phase2.createEnrolment));
router.patch("/:id/enrolments/:enrolmentId/close", authenticateToken, requireRoles("admin"), validate(CloseEnrolmentSchema), asyncHandler(phase2.closeEnrolment));
router.patch("/:id/enrolments/:enrolmentId", authenticateToken, requireRoles("admin"), validate(CloseEnrolmentSchema), asyncHandler(phase2.closeEnrolment));
router.patch("/:id", authenticateToken, requireRoles("admin"), validate(UpdateStudentSchema), asyncHandler(phase2.updateStudent));
router.get("/:id/attendance", authenticateToken, requireRoles(["admin", "teacher"]), asyncHandler(getStudentById));
router.get("/:id/grades", authenticateToken, requireRoles(["admin", "teacher"]), asyncHandler(getStudentById));
// router.post("/", authenticateToken, validate(CreateClassSchema), asyncHandler(createClass))

module.exports = router;
