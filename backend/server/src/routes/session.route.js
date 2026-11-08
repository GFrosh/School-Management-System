const { Router } = require("express");
const router = Router();

const validate = require("../middlewares/validateSchema");
const { CreateSessionSchema, CreateTermSchema, UpdateSessionSchema } = require("../schemas/session.schema");
const { authenticateToken } = require("../middlewares/authenticateToken");
const asyncHandler = require('../middlewares/asyncHandler');
const { getSession, getTermsBySessionId, createSession, updateSession, createTerm } = require("../controllers/session.controller");


router.get("/", asyncHandler(getSession));
router.get("/:id/terms", authenticateToken, asyncHandler(getTermsBySessionId));
router.post("/:id/terms", authenticateToken, validate(CreateTermSchema), asyncHandler(createTerm));
router.post("/", authenticateToken, validate(CreateSessionSchema), asyncHandler(createSession));
router.patch("/:id", authenticateToken, validate(UpdateSessionSchema), asyncHandler(updateSession));

// REMINDER TO PROTECT ALL ROUTES AFTER DEVELOPMENT WITH `AUTHENTICATE TOKEN`

module.exports = router;
