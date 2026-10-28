const config = require('../../config');
const { sendSuccess } = require('../../utils/respond');
const authService = require('./auth.service');

async function login(req, res) {
  const { email, password } = req.body;
  const result = await authService.login(email, password);

  res.cookie('refreshToken', result.refreshToken, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'strict',
    path: '/api/v1/auth',
    expires: result.refreshExpiresAt,
  });

  sendSuccess(res, {
    accessToken: result.accessToken,
    expiresIn: result.expiresIn,
    user: result.user,
  });
}

module.exports = { login };