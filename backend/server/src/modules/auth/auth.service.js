const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const AppError = require('../../utils/AppError');
const config = require('../../config');
const repo = require('./auth.repository');

// Compared against when the email doesn't exist, so both failures take similar time
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function login(email, password) {
  const user = await repo.findUserByEmail(email);
  const passwordOk = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);

  if (!user || !passwordOk || user.status !== 'active') {
    throw new AppError(401, 'UNAUTHENTICATED', 'Invalid credentials');
  }

  const [roles, profiles] = await Promise.all([
    repo.findRoleNames(user.id),
    repo.findProfiles(user.id),
  ]);

  const accessToken = jwt.sign({ sub: user.id, roles }, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessTtlSeconds,
  });

  const refreshToken = crypto.randomBytes(48).toString('hex');
  const refreshExpiresAt = new Date(
    Date.now() + config.jwt.refreshTtlDays * 24 * 60 * 60 * 1000
  );
  await repo.insertRefreshToken(user.id, hashToken(refreshToken), refreshExpiresAt);
  await repo.touchLastLogin(user.id);

  const displayName =
    profiles.teacher?.name || profiles.parent?.name || profiles.student?.name || user.email;

  return {
    accessToken,
    expiresIn: config.jwt.accessTtlSeconds,
    refreshToken,
    refreshExpiresAt,
    user: {
      id: user.id,
      email: user.email,
      displayName,
      roles,
      profiles: {
        teacherId: profiles.teacher?.id || null,
        parentId: profiles.parent?.id || null,
        studentId: profiles.student?.id || null,
      },
    },
  };
}

module.exports = { login, hashToken };