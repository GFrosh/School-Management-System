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

    const [roles, profiles] = await Promise.all([
      userRepo.getUserRoles(user.id),
      userRepo.getUserProfiles(user.id)
    ]);
    const rolesList = roles.map(r => r.name);
    
    const accessToken = jwt.sign(
      { sub: user.id, email: user.email, roles: rolesList },
      config.jwt.accessSecret,
      { expiresIn: config.jwt.accessTtlSeconds }
    );

    const sessionId = crypto.randomBytes(16).toString('hex');
    const refreshToken = jwt.sign(
      { sub: user.id, sessionId: sessionId },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshTtlDays }
    );

    const refreshTokenHash = hashToken(refreshToken);
    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await userRepo.updateUserRefreshToken({
      id: sessionId,
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
        displayName: profiles.userName,
        roles: rolesList,
        profiles
      }
    };
}


async function getAllUsers() {
  return await userRepo.getAllUsers();
}


async function getUserById(id) {
  const user = await userRepo.getUserById(id);
  const [ roles, profiles] = await Promise.all([
    userRepo.getUserRoles(id),
    userRepo.getUserProfiles(id)
  ]);
  const rolesList = roles.map(r => r.name);
  if (!user) {
    throw ApiResponse.error(404, "NOT_FOUND", "User not found");
  }
  return {
    user: {
      id: user.id,
      email: user.email,
      displayName: profiles.userName,
      roles: rolesList,
      profiles: profiles,
      scope: {
        taughtAssignments: null, // Placeholder for future implementation - TEACHER'S ONLY
        linkedStudents: null, // Placeholder for future implementation - PARENT'S ONLY
        currentSession: null // Placeholder for future implementation - PROBABLY FOR STUDENTS, PARENTS, AND TEACHERS
      }
    }
  };
}



async function getUserSessionById(id) {
  if (!id) throw ApiResponse.error(400, "INVALID_ID", "Session ID received is invalid.");
  return await userRepo.getUserSessionById(id);
}



async function refreshUserSession(token, id) {
  const hashedToken = hashToken(token);
  const storedTokenRecord = await userRepo.getRefreshTokenByHash(hashedToken);
  
  if (!storedTokenRecord || storedTokenRecord.revoked_at) {
    throw ApiResponse.error(401, "UNAUTHENTICATED", "Token has been revoked or invalid");
  }
  const user = await userRepo.getUserById(id);
  if (!user || user.status !== 'active') {
    throw ApiResponse.error(401, 'UNAUTHENTICATED', 'User no longer active');
  }

  const roles = await userRepo.getUserRoles(user.id);
  const rolesList = roles.map(r => r.name);
  const profiles = await userRepo.getUserProfiles(user.id);

  const newAccessToken = jwt.sign(
    { sub: user.id, email: user.email, roles: rolesList },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessTtlSeconds }
  );
  return {
    accessToken: newAccessToken,
    expiresIn: config.jwt.accessTtlSeconds,
    user: {
      id: user.id,
      email: user.email,
      roles: rolesList,
      profiles
    }
  };
}



async function revokeUserSession(sessionId) {
  const session = await userRepo.getUserSessionById(sessionId);
  console.log(session); // Debugging line to check the session object
  if (!session) {
    throw ApiResponse.error(404, "NOT_FOUND", "Session Not Found");
  }
  await userRepo.revokeUserRefreshToken(sessionId);
}

async function revokeAllUserSessions(userId) {
  const user = await userRepo.getUserById(userId);
  if (!user) throw ApiResponse.error(404, "NOT_FOUND", "User Not Found");

  await userRepo.revokeAllUserRefreshTokens(userId);
}

module.exports = { loginUser, hashToken, getAllUsers, getUserById, getUserSessionById, refreshUserSession, revokeUserSession, revokeAllUserSessions };
