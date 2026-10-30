/**
 * 04 — People: accounts and profile records.
 *
 * Depends on: roles (via user_roles), nothing else.
 * Enforces: users.status_check, students.staff/teacher status_check,
 *           admission_number / staff_number UNIQUE, students.user_id UNIQUE
 *           (nullable), student_guardians UNIQUE (student_id, parent_id) [C12],
 *           and the §3.2 rule that a guardian link carries a relationship.
 *
 * Two demo logins are enough to exercise every path in §7:
 *   admin@school.edu.ng     — admin
 *   t.okafor@school.edu.ng  — teacher AND parent (the §3.2 case in one person)
 * Remaining students exist as records with NO account, which is the day-one
 * reality described in §3.1 and must not be seeded away.
 *
 * All demo passwords are: Password123!
 */

// bcrypt hash of "Password123!" (cost 10, $2b$). Generated once so the seed is
// deterministic and does not need a native bcrypt dependency at seed time.

const bcrypt = require('bcryptjs');
const { adminEmail, adminPassword, adminUser } = require('../../src/config/index');


if (!adminEmail || !adminPassword) {
  throw new Error('Missing DB_ADMIN_EMAIL or DB_ADMIN_PASSWORD in .env');
}

const saltRounds = 10;
const hashedPassword = bcrypt.hashSync(adminPassword, saltRounds);


const ADMIN = {
  email: adminEmail,
  display: adminUser,
  roles: ['admin'],
};

const TEACHERS = [
  { staff_number: 'TCH/001', first_name: 'Tunde', last_name: 'Okafor', email: 't.okafor@school.edu.ng', roles: ['teacher', 'parent'], employment_date: '2019-09-02' },
  { staff_number: 'TCH/002', first_name: 'Ngozi', last_name: 'Eze', email: 'n.eze@school.edu.ng', roles: ['teacher'], employment_date: '2020-01-13' },
  { staff_number: 'TCH/003', first_name: 'Ibrahim', last_name: 'Sule', email: 'i.sule@school.edu.ng', roles: ['teacher'], employment_date: '2021-09-06' },
  { staff_number: 'TCH/004', first_name: 'Folake', last_name: 'Adeyemi', email: 'f.adeyemi@school.edu.ng', roles: ['teacher'], employment_date: '2018-04-16' },
  { staff_number: 'TCH/005', first_name: 'Chidi', last_name: 'Nwosu', email: 'c.nwosu@school.edu.ng', roles: ['teacher'], employment_date: '2022-09-05' },
  { staff_number: 'TCH/006', first_name: 'Amina', last_name: 'Bello', email: 'a.bello@school.edu.ng', roles: ['teacher'], employment_date: '2023-01-09' },
];

// JSS1A roster: 8 with accounts, 8 without (bulk-registered from paper forms).
const STUDENTS = [
  { admission_number: 'SMS/2026/0101', first_name: 'Chidi', middle_name: 'Emeka', last_name: 'Nwosu', gender: 'male', date_of_birth: '2014-03-11', email: 'chidi.nwosu@student.school.edu.ng' },
  { admission_number: 'SMS/2026/0102', first_name: 'Halima', middle_name: null, last_name: 'Yusuf', gender: 'female', date_of_birth: '2014-06-02', email: 'halima.yusuf@student.school.edu.ng' },
  { admission_number: 'SMS/2026/0103', first_name: 'Tobiloba', middle_name: 'Samuel', last_name: 'Ade', gender: 'male', date_of_birth: '2013-11-27', email: 'tobi.ade@student.school.edu.ng' },
  { admission_number: 'SMS/2026/0104', first_name: 'Zainab', middle_name: null, last_name: 'Abubakar', gender: 'female', date_of_birth: '2014-01-19', email: 'zainab.a@student.school.edu.ng' },
  { admission_number: 'SMS/2026/0105', first_name: 'Emeka', middle_name: 'Chukwu', last_name: 'Obi', gender: 'male', date_of_birth: '2013-09-08', email: null },
  { admission_number: 'SMS/2026/0106', first_name: 'Blessing', middle_name: null, last_name: 'Etim', gender: 'female', date_of_birth: '2014-04-23', email: null },
  { admission_number: 'SMS/2026/0107', first_name: 'Yusuf', middle_name: 'Ali', last_name: 'Danjuma', gender: 'male', date_of_birth: '2013-12-30', email: null },
  { admission_number: 'SMS/2026/0108', first_name: 'Grace', middle_name: null, last_name: 'Okonkwo', gender: 'female', date_of_birth: '2014-07-14', email: null },
  { admission_number: 'SMS/2026/0109', first_name: 'Samuel', middle_name: 'Tunde', last_name: 'Okafor', gender: 'male', date_of_birth: '2014-02-05', email: 'samuel.okafor@student.school.edu.ng' },
  { admission_number: 'SMS/2026/0110', first_name: 'Fatima', middle_name: null, last_name: 'Sani', gender: 'female', date_of_birth: '2014-05-21', email: null },
  { admission_number: 'SMS/2026/0111', first_name: 'Oluwaseun', middle_name: 'David', last_name: 'Ajayi', gender: 'male', date_of_birth: '2013-10-12', email: null },
  { admission_number: 'SMS/2026/0112', first_name: 'Chiamaka', middle_name: null, last_name: 'Ibe', gender: 'female', date_of_birth: '2014-08-03', email: null },
  { admission_number: 'SMS/2026/0113', first_name: 'Abdul', middle_name: 'Rahman', last_name: 'Lawal', gender: 'male', date_of_birth: '2014-01-30', email: null },
  { admission_number: 'SMS/2026/0114', first_name: 'Precious', middle_name: null, last_name: 'Uzoma', gender: 'female', date_of_birth: '2013-12-09', email: null },
  { admission_number: 'SMS/2026/0115', first_name: 'Daniel', middle_name: 'Ifeanyi', last_name: 'Eze', gender: 'male', date_of_birth: '2014-06-18', email: null },
  { admission_number: 'SMS/2026/0116', first_name: 'Aisha', middle_name: null, last_name: 'Mohammed', gender: 'female', date_of_birth: '2014-03-25', email: null },
];

// Guardians. Tunde Okafor is already a teacher; his parent profile is a second
// role on the same account, which is exactly the §3.2 case.
const PARENTS = [
  { first_name: 'Tunde', last_name: 'Okafor', phone: '+2348031110001', email: 't.okafor@school.edu.ng', account: 'teacher:t.okafor@school.edu.ng' },
  { first_name: 'Ngozi', last_name: 'Nwosu', phone: '+2348031110002', email: 'ngozi.nwosu@example.com', account: null },
  { first_name: 'Musa', last_name: 'Yusuf', phone: '+2348031110003', email: 'musa.yusuf@example.com', account: null },
  { first_name: 'Kemi', last_name: 'Ade', phone: '+2348031110004', email: 'kemi.ade@example.com', account: null },
];

// student admission_number -> guardian index in PARENTS, with relationship.
const GUARDIAN_LINKS = [
  { student: 'SMS/2026/0109', parent: 't.okafor@school.edu.ng', relationship: 'father', is_primary: true },
  { student: 'SMS/2026/0101', parent: 'ngozi.nwosu@example.com', relationship: 'mother', is_primary: true },
  { student: 'SMS/2026/0102', parent: 'musa.yusuf@example.com', relationship: 'father', is_primary: true },
  { student: 'SMS/2026/0103', parent: 'kemi.ade@example.com', relationship: 'mother', is_primary: true },
];

const roleIdByRole = async (knex) => {
  const rows = await knex('roles').select('id', 'name');
  return new Map(rows.map((r) => [r.name, r.id]));
};

const ensureUser = async (knex, { email, status = 'active' }) => {
  if (!email) return null;
  const existing = await knex('users').where({ email }).first('id');
  if (existing) return existing.id;
  const [row] = await knex('users')
    .insert({ email, password_hash: hashedPassword, status })
    .returning('id');
  return row.id ?? row;
};

const grantRoles = async (knex, userId, roleNames, roles) => {
  for (const name of roleNames) {
    await knex('user_roles')
      .insert({ user_id: userId, role_id: roles.get(name) })
      .onConflict(['user_id', 'role_id'])
      .ignore();
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function seed(knex) {
  const roles = await roleIdByRole(knex);

  // ---------------------------------------------------------------- admin
  const adminId = await ensureUser(knex, { email: ADMIN.email });
  await grantRoles(knex, adminId, ADMIN.roles, roles);

  // -------------------------------------------------------------- teachers
  for (const t of TEACHERS) {
    const userId = await ensureUser(knex, { email: t.email });
    await grantRoles(knex, userId, t.roles, roles);

    await knex('teachers')
      .insert({
        user_id: userId,
        staff_number: t.staff_number,
        first_name: t.first_name,
        last_name: t.last_name,
        employment_date: t.employment_date,
      })
      .onConflict('staff_number')
      .merge(['user_id', 'first_name', 'last_name', 'employment_date', 'updated_at']);

  }

  // -------------------------------------------------------------- students
  for (const s of STUDENTS) {
    // Students WITHOUT an email get no account — deliberately (§3.1).
    const userId = s.email ? await ensureUser(knex, { email: s.email }) : null;
    if (userId) await grantRoles(knex, userId, ['student'], roles);

    await knex('students')
      .insert({
        user_id: userId,
        admission_number: s.admission_number,
        first_name: s.first_name,
        middle_name: s.middle_name,
        last_name: s.last_name,
        date_of_birth: s.date_of_birth,
        gender: s.gender,
        admission_date: '2026-09-07',
      })
      .onConflict('admission_number')
      .merge(['user_id', 'first_name', 'middle_name', 'last_name', 'date_of_birth', 'gender', 'updated_at']);
  }

  // --------------------------------------------------------------- parents
  const parentIdByEmail = new Map();
  for (const p of PARENTS) {
    // A guardian who is also a teacher reuses that teacher's account.
    const userId = p.account
      ? await knex('users').where({ email: p.account.split(':')[1] }).first('id').then((r) => r?.id ?? null)
      : await ensureUser(knex, { email: p.email });

    if (userId) await grantRoles(knex, userId, ['parent'], roles);

    // parents.email is NOT unique in the schema (a contact address may repeat or
    // differ from the login address), so resolve by lookup, not ON CONFLICT.
    const existing = await knex('parents').where({ email: p.email }).first('id');

    if (existing) {
      await knex('parents').where({ id: existing.id }).update({
        user_id: userId,
        first_name: p.first_name,
        last_name: p.last_name,
        phone: p.phone,
        updated_at: knex.fn.now(),
      });
      parentIdByEmail.set(p.email, existing.id);
    } else {
      const [row] = await knex('parents')
        .insert({
          user_id: userId,
          first_name: p.first_name,
          last_name: p.last_name,
          phone: p.phone,
          email: p.email,
        })
        .returning('id');
      parentIdByEmail.set(p.email, row.id ?? row);
    }
  }

  // ----------------------------------------------------- guardian links
  for (const link of GUARDIAN_LINKS) {
    const student = await knex('students').where({ admission_number: link.student }).first('id');
    const parentId = parentIdByEmail.get(link.parent);
    if (!student || !parentId) continue;

    await knex('student_guardians')
      .insert({
        student_id: student.id,
        parent_id: parentId,
        relationship: link.relationship,
        is_primary: link.is_primary,
      })
      .onConflict(['student_id', 'parent_id'])
      .merge(['relationship', 'is_primary', 'updated_at']);
  }

  const [{ count: users }] = await knex('users').count('id as count');
  const [{ count: students }] = await knex('students').count('id as count');
  const [{ count: links }] = await knex('student_guardians').count('id as count');
  // eslint-disable-next-line no-console
  console.log(`  04_people: ${users} accounts, ${students} students, ${links} guardian links`);
};
