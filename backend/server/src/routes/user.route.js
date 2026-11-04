const { Router } = require('express');
const router = Router();

const { UserLoginSchema } = require('../schemas/user.schema');
const validateBody = require('../middlewares/validateSchema');
const asyncHandler = require('../middlewares/asyncHandler');
const { authenticateToken, authenticateRefreshToken } = require("../middlewares/authenticateToken");
const { handleLogin, fetchAll, getSession, refreshSession, revokeSession, revokeAllUserSessionsHandler } = require('../controllers/user.controller');


router.get("/", asyncHandler(fetchAll));
router.get("/me", authenticateToken, asyncHandler(getSession));
router.post("/refresh", authenticateRefreshToken, asyncHandler(refreshSession));
router.post("/login", validateBody(UserLoginSchema), asyncHandler(handleLogin));
router.post("/logout", authenticateRefreshToken, asyncHandler(revokeSession));
router.post("/logout/all", authenticateToken, asyncHandler(revokeAllUserSessionsHandler));
// router.post("/register", asyncHandler(userController.register));

module.exports = router;
