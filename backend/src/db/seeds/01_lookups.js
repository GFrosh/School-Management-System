/**
 * 01 — Lookups and immutable reference data.
 *
 * Runs first because every other seed resolves a foreign key into these tables.
 * Safe to re-run: every insert is an upsert on a natural key.
 *
 * Tables: roles (§5.5), subjects (§5.5)
 * Note: the four roles are already inserted by the migration (it owns the enum
 * vocabulary), so this file is written to be idempotent either way.
 */

const ROLES = [
  { name: 'admin', description: 'Administrator: manages people, structure, assignments and publication' },
  { name: 'teacher', description: 'Teacher: attendance and scores for assigned classes only' },
  { name: 'student', description: 'Student: own profile, attendance and published results' },
  { name: 'parent', description: 'Guardian: linked children only, published results only' },
];

// Codes are the school's own abbreviations; `is_core` drives whether a subject
// appears on every report card.
const SUBJECTS = [
  { code: 'ENG', name: 'English Language', is_core: true },
  { code: 'MTH', name: 'Mathematics', is_core: true },
  { code: 'BSC', name: 'Basic Science', is_core: true },
  { code: 'BST', name: 'Basic Technology', is_core: true },
  { code: 'NVE', name: 'National Values Education', is_core: true },
  { code: 'CCA', name: 'Cultural and Creative Arts', is_core: true },
  { code: 'PHE', name: 'Physical and Health Education', is_core: true },
  { code: 'CRS', name: 'Christian Religious Studies', is_core: false },
  { code: 'IRS', name: 'Islamic Religious Studies', is_core: false },
  { code: 'BUS', name: 'Business Studies', is_core: true },
  { code: 'AGR', name: 'Agricultural Science', is_core: false },
  { code: 'HME', name: 'Home Economics', is_core: false },
  { code: 'CIV', name: 'Civic Education', is_core: true },
  { code: 'YOR', name: 'Yoruba Language', is_core: false },
  { code: 'FRE', name: 'French Language', is_core: false },
  { code: 'CMP', name: 'Computer Studies', is_core: true },
  { code: 'BIO', name: 'Biology', is_core: false },
  { code: 'CHM', name: 'Chemistry', is_core: false },
  { code: 'PHY', name: 'Physics', is_core: false },
  { code: 'FMT', name: 'Further Mathematics', is_core: false },
  { code: 'ECO', name: 'Economics', is_core: false },
  { code: 'GEO', name: 'Geography', is_core: false },
  { code: 'GOV', name: 'Government', is_core: false },
  { code: 'LIT', name: 'Literature in English', is_core: false },
  { code: 'COM', name: 'Commerce', is_core: false },
  { code: 'ACC', name: 'Financial Accounting', is_core: false },
];

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function seed(knex) {
  // Upsert rather than delete: roles may already be referenced by user_roles,
  // and truncating a lookup table would fail while FK rows exist.
  await knex('roles')
    .insert(ROLES)
    .onConflict('name')
    .merge(['description']);

  await knex('subjects')
    .insert(SUBJECTS)
    .onConflict('code')
    .merge(['name', 'is_core']);

  // eslint-disable-next-line no-console
  console.log(`  01_lookups: ${ROLES.length} roles, ${SUBJECTS.length} subjects`);
};
