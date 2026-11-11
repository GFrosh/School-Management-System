const { Router } = require("express");
const router = Router();

const validate = require("../middlewares/validateSchema");
const { CreateSessionSchema, CreateTermSchema, UpdateSessionSchema } = require("../schemas/session.schema");
const requireRoles = require("../middlewares/requireRoles");
const { authenticateToken } = require("../middlewares/authenticateToken");
const asyncHandler = require('../middlewares/asyncHandler');
const { getSession, getTermsBySessionId, createSession, updateSession, createTerm } = require("../controllers/session.controller");




router.get("/", authenticateToken, requireRoles("*"), asyncHandler(getSession));
router.post("/", authenticateToken, requireRoles("admin"), validate(CreateSessionSchema), asyncHandler(createSession));
router.patch("/:id", authenticateToken, requireRoles("admin"), validate(UpdateSessionSchema), asyncHandler(updateSession));
router.get("/:id/terms", authenticateToken, requireRoles("*"), asyncHandler(getTermsBySessionId));
router.post("/:id/terms", authenticateToken, requireRoles("admin"), validate(CreateTermSchema), asyncHandler(createTerm));

module.exports = router;
