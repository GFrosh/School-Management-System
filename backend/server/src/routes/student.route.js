const { Router } = require("express");
const router = Router();


const validate = require("../middlewares/validateSchema");
const { GetStudentsQuerySchema } = require("../schemas/student.schema");
const { authenticateToken } = require("../middlewares/authenticateToken");
const requireRoles = require("../middlewares/requireRoles");
const asyncHandler = require("../middlewares/asyncHandler");
const { getStudents, getStudentById, getStudentEnrolments } = require("../controllers/student.controller");




router.get("/", authenticateToken, requireRoles(["admin", "teacher"]), validate(GetStudentsQuerySchema), asyncHandler(getStudents));
router.get("/:id", authenticateToken, requireRoles(["admin", "teacher"]), asyncHandler(getStudentById));
router.get("/:id/enrolments", authenticateToken, requireRoles(["admin", "teacher"]), asyncHandler(getStudentEnrolments));
router.get("/:id/attendance", authenticateToken, requireRoles(["admin", "teacher"]), asyncHandler(getStudentById));
router.get("/:id/grades", authenticateToken, requireRoles(["admin", "teacher"]), asyncHandler(getStudentById));
// router.post("/", authenticateToken, validate(CreateClassSchema), asyncHandler(createClass))

module.exports = router;
