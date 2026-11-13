/**
 * 06 — Teaching assignments and class teachers.
 *
 * Depends on: teachers, classes, subjects, terms
 * Enforces: C4 teaching_assignments_one_primary (one PRIMARY teacher per
 *           class/subject/term), unique (id, term_id) as the C7 FK target.
 *
 * Also attaches classes.class_teacher_id (deferred from 03 to keep the file
 * dependency order acyclic).
 */

// staff_number -> class they are responsible for (form teacher)
const CLASS_TEACHERS = [
  ['TCH/001', 'JSS1A'],
  ['TCH/002', 'JSS1B'],
  ['TCH/003', 'JSS2A'],
  ['TCH/004', 'SS2A'],
  ['TCH/005', 'JSS3A'],
  ['TCH/006', 'SS1A'],
];

// [staff_number, class, subject_code] for the CURRENT session's First Term.
// JSS1A is fully staffed so the attendance and score screens have a real roster.
const ASSIGNMENTS = [
  ['TCH/001', 'JSS1A', 'MTH'],
  ['TCH/002', 'JSS1A', 'ENG'],
  ['TCH/003', 'JSS1A', 'BSC'],
  ['TCH/004', 'JSS1A', 'CIV'],
  ['TCH/005', 'JSS1A', 'CMP'],
  ['TCH/006', 'JSS1A', 'PHE'],
  ['TCH/001', 'SS2A', 'MTH'],
  ['TCH/002', 'SS2A', 'ENG'],
  ['TCH/004', 'SS2A', 'LIT'],
  ['TCH/003', 'SS2A', 'PHY'],
];

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function seed(knex) {
  const teachers = new Map(
    (await knex('teachers').select('id', 'staff_number')).map((r) => [r.staff_number, r.id]),
  );
  const classes = new Map(
    (await knex('classes').select('id', 'name')).map((r) => [r.name, r.id]),
  );
  const subjects = new Map(
    (await knex('subjects').select('id', 'code')).map((r) => [r.code, r.id]),
  );
  const session = await knex('academic_sessions').where({ is_current: true }).first('id');
  const term = await knex('terms')
    .where({ session_id: session.id, sequence: 1 })
    .first('id');

  // ------------------------------------------------- class teachers
  for (const [staffNumber, className] of CLASS_TEACHERS) {
    await knex('classes')
      .where({ name: className })
      .update({ class_teacher_id: teachers.get(staffNumber), updated_at: knex.fn.now() });
  }

  // ------------------------------------------------- assignments
  for (const [staffNumber, className, subjectCode] of ASSIGNMENTS) {
    const row = {
      teacher_id: teachers.get(staffNumber),
      class_id: classes.get(className),
      subject_id: subjects.get(subjectCode),
      term_id: term.id,
      is_primary: true,
    };
    if (!row.teacher_id || !row.class_id || !row.subject_id) continue;

    const existing = await knex('teaching_assignments')
      .where({
        class_id: row.class_id,
        subject_id: row.subject_id,
        term_id: row.term_id,
        is_primary: true,
      })
      .first('id');

    if (existing) {
      await knex('teaching_assignments')
        .where({ id: existing.id })
        .update({ teacher_id: row.teacher_id, updated_at: knex.fn.now() });
    } else {
      await knex('teaching_assignments').insert(row);
    }
  }

  const [{ count }] = await knex('teaching_assignments').count('id as count');
  // eslint-disable-next-line no-console
  console.log(`  06_teaching_assignments: ${count} assignments for First Term, current session`);
};
