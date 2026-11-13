const { Router } = require('express');
const router = Router();

const { UserLoginSchema, passwordChangeSchema } = require('../schemas/user.schema');
const validateBody = require('../middlewares/validateSchema');
const validate = validateBody;
const asyncHandler = require('../middlewares/asyncHandler');
const { authenticateToken, authenticateRefreshToken } = require("../middlewares/authenticateToken");
const { handleLogin, fetchAll, getSession, refreshSession, revokeSession, revokeAllUserSessionsHandler, changePasswordHandler } = require('../controllers/user.controller');
const phase2 = require("../controllers/phase2.controller");
const { UserStatusSchema } = require("../schemas/phase2.schema");
const requireRoles = require("../middlewares/requireRoles");


router.get("/", authenticateToken, requireRoles("admin"), asyncHandler(fetchAll));
router.get("/me", authenticateToken, asyncHandler(getSession));
router.post("/refresh", authenticateRefreshToken, asyncHandler(refreshSession));
router.post("/login", validateBody(UserLoginSchema), asyncHandler(handleLogin));
router.post("/logout", authenticateRefreshToken, asyncHandler(revokeSession));
router.post("/logout/all", authenticateToken, asyncHandler(revokeAllUserSessionsHandler));
router.post("/password", authenticateToken, validateBody(passwordChangeSchema), asyncHandler(changePasswordHandler));
router.patch("/:id/status", authenticateToken, requireRoles("admin"), validateBody(UserStatusSchema), asyncHandler(phase2.updateUserStatus));
// router.post("/register", asyncHandler(userController.register));

module.exports = router;
