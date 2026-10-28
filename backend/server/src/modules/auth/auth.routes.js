const router = require('express').Router();
const asyncHandler = require('../../utils/asyncHandler');
const validateBody = require('../../middleware/validateBody');
const { loginSchema } = require('./auth.schemas');
const authController = require('./auth.controller');

router.post('/login', validateBody(loginSchema), asyncHandler(authController.login));

module.exports = router;