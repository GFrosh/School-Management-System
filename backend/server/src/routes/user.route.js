const { Router } = require('express');
const router = Router();

const { UserLoginSchema } = require('../schemas/user.schema');
const validateBody = require('../middlewares/validateSchema');
const asyncHandler = require('../middlewares/asyncHandler');
const { handleLogin, fetchAll } = require('../controllers/user.controller');


router.get("/", asyncHandler(fetchAll));
router.post("/login", validateBody(UserLoginSchema), asyncHandler(handleLogin));
// router.post("/register", asyncHandler(userController.register));

module.exports = router;
