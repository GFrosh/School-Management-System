/**
 * 03 — Class definitions.
 *
 * Depends on: teachers (class_teacher_id, nullable) — seeded later, so the class
 *             teacher is attached in 06 to keep file dependencies acyclic.
 * Enforces: classes.name UNIQUE, classes_level_check 1..12.
 *
 * A class is a stable definition, NOT per session (§5.3). Junior secondary is
 * JSS1–JSS3, senior secondary SS1–SS3, two arms each.
 */

const CLASSES = [
  { name: 'JSS1A', level: 1 },
  { name: 'JSS1B', level: 1 },
  { name: 'JSS2A', level: 2 },
  { name: 'JSS2B', level: 2 },
  { name: 'JSS3A', level: 3 },
  { name: 'JSS3B', level: 3 },
  { name: 'SS1A', level: 4 },
  { name: 'SS1B', level: 4 },
  { name: 'SS2A', level: 5 },
  { name: 'SS2B', level: 5 },
  { name: 'SS3A', level: 6 },
  { name: 'SS3B', level: 6 },
];

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function seed(knex) {
  await knex('classes')
    .insert(CLASSES)
    .onConflict('name')
    .merge(['level', 'updated_at']);

  const [{ count }] = await knex('classes').count('id as count');
  // eslint-disable-next-line no-console
  console.log(`  03_classes: ${count} classes`);
};
