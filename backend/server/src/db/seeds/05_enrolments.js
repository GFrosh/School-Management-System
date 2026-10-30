/**
 * 05 — Enrolments (placement history).
 *
 * Depends on: students, classes, academic_sessions
 * Enforces: C1 enrolments_one_active_per_session, C1b one_live_per_session,
 *           C10 dates_check, enrolments_status_check.
 *
 * Demonstrates the §4.1/§4.2 rule: NO row is updated in place. The JSS1A roster
 * gets a closed 2025/2026 row (status 'promoted') and a live 2026/2027 row, so
 * a query that joins results to "current class" cannot silently rewrite history.
 */

// admission_number -> [pastClass, currentClass]
const PLACEMENTS = [
  ['SMS/2026/0101', 'JSS1A', 'JSS1A'],
  ['SMS/2026/0102', 'JSS1A', 'JSS1A'],
  ['SMS/2026/0103', 'JSS1A', 'JSS1A'],
  ['SMS/2026/0104', 'JSS1A', 'JSS1A'],
  ['SMS/2026/0105', 'JSS1A', 'JSS1A'],
  ['SMS/2026/0106', 'JSS1A', 'JSS1A'],
  ['SMS/2026/0107', 'JSS1A', 'JSS1A'],
  ['SMS/2026/0108', 'JSS1A', 'JSS1A'],
  ['SMS/2026/0109', 'JSS1A', 'JSS1A'],
  ['SMS/2026/0110', 'JSS1A', 'JSS1A'],
  ['SMS/2026/0111', 'JSS1A', 'JSS1A'],
  ['SMS/2026/0112', 'JSS1A', 'JSS1A'],
  ['SMS/2026/0113', 'JSS1A', 'JSS1A'],
  ['SMS/2026/0114', 'JSS1A', 'JSS1A'],
  ['SMS/2026/0115', 'JSS1A', 'JSS1A'],
  ['SMS/2026/0116', 'JSS1A', 'JSS1A'],
];

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function seed(knex) {
  const sessions = new Map(
    (await knex('academic_sessions').select('id', 'name')).map((r) => [r.name, r.id]),
  );
  const classes = new Map(
    (await knex('classes').select('id', 'name')).map((r) => [r.name, r.id]),
  );
  const students = new Map(
    (await knex('students').select('id', 'admission_number')).map((r) => [r.admission_number, r.id]),
  );

  const past = sessions.get('2025/2026');
  const current = sessions.get('2026/2027');

  for (const [admission, , currentClass] of PLACEMENTS) {
    const studentId = students.get(admission);
    if (!studentId) continue;
    const classId = classes.get(currentClass);

    // --- closed historical placement (2025/2026) -----------------------------
    const existingPast = await knex('enrolments')
      .where({ student_id: studentId, session_id: past })
      .first('id');

    if (!existingPast) {
      await knex('enrolments').insert({
        student_id: studentId,
        class_id: classId,
        session_id: past,
        status: 'promoted',
        enrolled_on: '2025-09-08',
        ended_on: '2026-07-24',
      });
    }

    // --- live placement (2026/2027) -----------------------------------------
    const existingLive = await knex('enrolments')
      .where({ student_id: studentId, session_id: current })
      .first('id');

    if (!existingLive) {
      await knex('enrolments').insert({
        student_id: studentId,
        class_id: classId,
        session_id: current,
        status: 'active',
        enrolled_on: '2026-09-07',
        ended_on: null,
      });
    }
  }

  const [{ count: total }] = await knex('enrolments').count('id as count');
  const [{ count: active }] = await knex('enrolments').where({ status: 'active' }).count('id as count');
  // eslint-disable-next-line no-console
  console.log(`  05_enrolments: ${total} placements (${active} active, ${total - active} closed history)`);
};
