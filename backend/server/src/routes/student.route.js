const { Router } = require("express");
const router = Router();


const validate = require("../middlewares/validateSchema");
const { GetStudentsQuerySchema } = require("../schemas/student.schema");
const { authenticateToken } = require("../middlewares/authenticateToken");
const requireRoles = require("../middlewares/requireRoles");
const asyncHandler = require("../middlewares/asyncHandler");
const { getStudents } = require("../controllers/student.controller");




router.get("/", authenticateToken, requireRoles(["admin", "teacher"]), validate(GetStudentsQuerySchema), asyncHandler(getStudents));
// router.post("/", authenticateToken, validate(CreateClassSchema), asyncHandler(createClass))

module.exports = router;
