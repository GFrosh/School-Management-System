const { Router } = require("express");
const router = Router();

const validate = require("../middlewares/validateSchema");
const { CreateSessionSchema, CreateTermSchema } = require("../schemas/session.schema");
const { authenticateToken } = require("../middlewares/authenticateToken");
const asyncHandler = require('../middlewares/asyncHandler');
const { getSession, getTermsBySessionId, createSession } = require("../controllers/session.controller");


router.get("/", asyncHandler(getSession));
router.get("/:id/terms", authenticateToken, asyncHandler(getTermsBySessionId));
router.post("/", authenticateToken, asyncHandler(createSession));


// REMINDER TO PROTECT ALL ROUTES AFTER DEVELOPMENT WITH `AUTHENTICATE TOKEN`

module.exports = router;
