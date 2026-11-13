/**
 * 08 — Attendance: registers and their records.
 *
 * Depends on: teaching_assignments, enrolments, users
 * Enforces: C5 unique (teaching_assignment_id, attendance_date, period_no),
 *           C6 unique (register_id, enrolment_id),
 *           attendance_registers_status_check, attendance_records_status_check.
 *
 * Two weeks of First Term for JSS1A Mathematics, weekdays only. Past dates are
 * used deliberately: §3.4 forbids submitting a register for a future date, and
 * the seed should never contain data the API would refuse to create.
 */

const PERIOD_NO = 3; // Mathematics sits in period 3 on the seeded timetable

// Weekdays from 2026-09-21 to 2026-10-02 inclusive.
const DATES = [
  '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25',
  '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02',
];

// Deterministic marks: mostly present, occasional absent/late.
const STATUSES = ['present', 'present', 'present', 'present', 'absent', 'present', 'late', 'present', 'present', 'excused'];

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function seed(knex) {
  const teacherUser = await knex('users').where({ email: 't.okafor@school.edu.ng' }).first('id');

  const assignment = await knex('teaching_assignments')
    .join('classes', 'classes.id', 'teaching_assignments.class_id')
    .join('subjects', 'subjects.id', 'teaching_assignments.subject_id')
    .join('terms', 'terms.id', 'teaching_assignments.term_id')
    .where({ 'classes.name': 'JSS1A', 'subjects.code': 'MTH', 'terms.sequence': 1 })
    .first('teaching_assignments.id as id');

  if (!assignment) {
    // eslint-disable-next-line no-console
    console.log('  08_attendance: skipped (no JSS1A Mathematics assignment)');
    return;
  }

  const enrolments = await knex('enrolments')
    .join('classes', 'classes.id', 'enrolments.class_id')
    .join('academic_sessions', 'academic_sessions.id', 'enrolments.session_id')
    .where({ 'classes.name': 'JSS1A', 'academic_sessions.is_current': true, 'enrolments.status': 'active' })
    .select('enrolments.id');

  let registers = 0;
  let records = 0;

  for (const [d, date] of DATES.entries()) {
    const existing = await knex('attendance_registers')
      .where({
        teaching_assignment_id: assignment.id,
        attendance_date: date,
        period_no: PERIOD_NO,
      })
      .first('id');

    let registerId = existing?.id;
    if (!registerId) {
      const [row] = await knex('attendance_registers')
        .insert({
          teaching_assignment_id: assignment.id,
          attendance_date: date,
          period_no: PERIOD_NO,
          status: 'submitted',
          submitted_by: teacherUser?.id ?? null,
          submitted_at: new Date(`${date}T10:15:00Z`).toISOString(),
        })
        .returning('id');
      registerId = row.id ?? row;
      registers += 1;
    }

    for (const [i, e] of enrolments.entries()) {
      const status = STATUSES[(i + d) % STATUSES.length];
      const already = await knex('attendance_records')
        .where({ register_id: registerId, enrolment_id: e.id })
        .first('id');

      if (!already) {
        await knex('attendance_records').insert({
          register_id: registerId,
          enrolment_id: e.id,
          status,
        });
        records += 1;
      }
    }
  }

  const [{ count }] = await knex('attendance_records').count('id as count');
  // eslint-disable-next-line no-console
  console.log(`  08_attendance: ${registers} new registers, ${records} new records (${count} total)`);
};
