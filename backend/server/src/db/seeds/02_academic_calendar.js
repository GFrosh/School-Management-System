/**
 * 02 — Sessions and terms.
 *
 * Depends on: nothing (academic_sessions has no FKs).
 * Enforces: C11 unique (session_id, sequence), terms_sequence_check 1..3,
 *           dates_check end > start, and academic_sessions_single_current
 *           (only ONE row may have is_current = TRUE).
 *
 * Dates are real calendar facts for a Nigerian school year: three terms,
 * roughly September–December, January–March, April–July.
 */

const SESSIONS = [
  {
    name: '2025/2026',
    start_date: '2025-09-08',
    end_date: '2026-07-24',
    is_current: false,
    terms: [
      { sequence: 1, name: 'First Term', start_date: '2025-09-08', end_date: '2025-12-12' },
      { sequence: 2, name: 'Second Term', start_date: '2026-01-12', end_date: '2026-03-27' },
      { sequence: 3, name: 'Third Term', start_date: '2026-04-20', end_date: '2026-07-24' },
    ],
  },
  {
    name: '2026/2027',
    start_date: '2026-09-07',
    end_date: '2027-07-23',
    is_current: true,
    terms: [
      { sequence: 1, name: 'First Term', start_date: '2026-09-07', end_date: '2026-12-11' },
      { sequence: 2, name: 'Second Term', start_date: '2027-01-11', end_date: '2027-03-26' },
      { sequence: 3, name: 'Third Term', start_date: '2027-04-19', end_date: '2027-07-23' },
    ],
  },
];

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function seed(knex) {
  // Clear the current flag first: the partial unique index permits only one TRUE.
  await knex('academic_sessions').where({ is_current: true }).update({ is_current: false });

  for (const { terms, ...session } of SESSIONS) {
    const [row] = await knex('academic_sessions')
      .insert(session)
      .onConflict('name')
      .merge(['start_date', 'end_date', 'is_current', 'updated_at'])
      .returning('id');

    const sessionId = row.id ?? row;

    for (const term of terms) {
      await knex('terms')
        .insert({ ...term, session_id: sessionId })
        .onConflict(['session_id', 'sequence'])
        .merge(['name', 'start_date', 'end_date', 'updated_at']);
    }
  }

  const [{ count: sessions }] = await knex('academic_sessions').count('id as count');
  const [{ count: terms }] = await knex('terms').count('id as count');
  // eslint-disable-next-line no-console
  console.log(`  02_academic_calendar: ${sessions} sessions, ${terms} terms`);
};
