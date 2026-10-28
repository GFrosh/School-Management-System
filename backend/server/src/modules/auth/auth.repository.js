const pool = require('../../database/pool');

async function findUserByEmail(email) {
  const { rows } = await pool.query(
    `SELECT id, email, password_hash, status
     FROM users
     WHERE lower(email) = lower($1)`,
    [email]
  );
  return rows[0] || null;
}

async function findRoleNames(userId) {
  const { rows } = await pool.query(
    `SELECT r.name
     FROM user_roles ur
     JOIN roles r ON r.id = ur.role_id
     WHERE ur.user_id = $1`,
    [userId]
  );
  return rows.map((row) => row.name);
}

async function findProfiles(userId) {
  const [teacher, parent, student] = await Promise.all([
    pool.query('SELECT id, name FROM teachers WHERE user_id = $1', [userId]),
    pool.query('SELECT id, name FROM parents WHERE user_id = $1', [userId]),
    pool.query('SELECT id, name FROM students WHERE user_id = $1', [userId]),
  ]);
  return {
    teacher: teacher.rows[0] || null,
    parent: parent.rows[0] || null,
    student: student.rows[0] || null,
  };
}

async function insertRefreshToken(userId, tokenHash, expiresAt) {
  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt]
  );
}

async function touchLastLogin(userId) {
  await pool.query('UPDATE users SET last_login_at = now() WHERE id = $1', [userId]);
}

module.exports = {
  findUserByEmail,
  findRoleNames,
  findProfiles,
  insertRefreshToken,
  touchLastLogin,
};