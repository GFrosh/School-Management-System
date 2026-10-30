const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const ApiResponse = require("../utils/Response");
const config = require('../config/index');
const UserRepository = require("../repositories/user.repository");

const MAX_FAILED_ATTEMPTS = 5;
const userRepo = new UserRepository();
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function loginUser(email, password) {
    const user = await userRepo.getUserByEmail(email);
    
    if (!user) {
      throw ApiResponse.error(401, 'UNAUTHENTICATED', 'Invalid credentials');
    }

    if (user.locked_until && new Date() < new Date(user.locked_until)) {
      const minutesRemaining = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
      throw ApiResponse.error(423, "ACCOUNT_LOCKED", `Account is locked. Try again in ${minutesRemaining} minute(s)`);
    }

    const isPasswordValid = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);

    if (!isPasswordValid) {
      const failedAttempts = user.failed_attempts + 1; // Block scoped to this IF statement

      if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
        const lockUntil = new Date(Date.now() + config.jwt.lockoutDurationMinutes * 60000);
        await userRepo.updateUserFailedAttempts(user.id, { failed_attempts: failedAttempts, locked_until: lockUntil });
        throw ApiResponse.error(401, "UNAUTHENTICATED", "Invalid Credentials");
      }

      await userRepo.updateUserFailedAttempts(user.id, { failed_attempts: failedAttempts });
      throw ApiResponse.error(401, "UNAUTHENTICATED", "Invalid Credentials");
    }

    // SUCCESS... RESET VALUES AT ROOT LEVEL TO AVOID BLOCKED-SCOPE ERRORS
    await userRepo.updateUserLastLogin(user.id, {
      failed_attempts: 0,
      locked_until: null
    });

    const roles = await userRepo.getUserRoles(user.id);
    const rolesList = roles.map(r => r.name); 

    const accessToken = jwt.sign(
      { sub: user.id, email: user.email, roles: rolesList },
      config.jwt.accessSecret,
      { expiresIn: config.jwt.accessTtlSeconds }
    );

    const refreshToken = jwt.sign(
      { sub: user.id },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshTtlDays }
    );

    const refreshTokenHash = hashToken(refreshToken);
    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await userRepo.updateUserRefreshToken({
      user_id: user.id,
      token_hash: refreshTokenHash,
      expires_at: refreshExpiresAt
    });
    
    // RETURN RAW DATA SO CONTROLLER CAN HANDLE THE HTTP RESPONSE LAYER
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        roles: rolesList,
      }
    };
}


async function getAllUsers() {
  return await userRepo.getAllUsers();
}

module.exports = { loginUser, hashToken, getAllUsers };
