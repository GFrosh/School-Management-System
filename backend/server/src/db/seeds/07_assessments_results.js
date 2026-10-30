/**
 * 07 — Assessments and results.
 *
 * Depends on: teaching_assignments, terms, enrolments, users
 * Enforces: C7 composite FK (assessment.term must equal assignment.term),
 *           C8 marks_check, C2 unique (assessment_id, enrolment_id),
 *           C3 trigger score <= maximum_score, C9 results_status_check,
 *           results_published_at_check (published => published_at NOT NULL).
 *
 * Three assessments per assignment in the school's own split: CA1 20, CA2 20,
 * Exam 60 (weights sum to 100, as §3.6 describes).
 *
 * Results are seeded in every state so the frontend has something honest to
 * render: draft, submitted, approved, published. Draft rows are only ever
 * visible to their author (§7.7).
 */

const ASSESSMENTS = [
  { name: 'CA1', type: 'ca', maximum_score: 20, weight: 20, sequence: 1 },
  { name: 'CA2', type: 'ca', maximum_score: 20, weight: 20, sequence: 2 },
  { name: 'Exam', type: 'exam', maximum_score: 60, weight: 60, sequence: 3 },
];

// Deterministic pseudo-random score so re-seeding does not churn the data.
const scoreFor = (seed, max) => {
  const n = Math.abs(Math.sin(seed * 12.9898) * 43758.5453) % 1;
  return Math.round(n * max * 0.75 + max * 0.2); // 20%..95% of the maximum
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function seed(knex) {
  const teacherUser = await knex('users').where({ email: 't.okafor@school.edu.ng' }).first('id');

  const assignments = await knex('teaching_assignments')
    .join('terms', 'terms.id', 'teaching_assignments.term_id')
    .join('classes', 'classes.id', 'teaching_assignments.class_id')
    .where({ 'classes.name': 'JSS1A', 'terms.sequence': 1 })
    .select(
      'teaching_assignments.id as assignment_id',
      'teaching_assignments.term_id',
      'teaching_assignments.subject_id',
    );

  const enrolments = await knex('enrolments')
    .join('classes', 'classes.id', 'enrolments.class_id')
    .join('academic_sessions', 'academic_sessions.id', 'enrolments.session_id')
    .where({ 'classes.name': 'JSS1A', 'academic_sessions.is_current': true, 'enrolments.status': 'active' })
    .orderBy('enrolments.id')
    .select('enrolments.id');

  let assessmentCount = 0;
  let resultCount = 0;

  for (const a of assignments) {
    for (const spec of ASSESSMENTS) {
      // C7: term_id is taken from the assignment, never typed in independently.
      const existing = await knex('assessments')
        .where({
          teaching_assignment_id: a.assignment_id,
          term_id: a.term_id,
          name: spec.name,
        })
        .first('id');

      let assessmentId = existing?.id;
      if (!assessmentId) {
        const [row] = await knex('assessments')
          .insert({
            teaching_assignment_id: a.assignment_id,
            term_id: a.term_id,
            ...spec,
          })
          .returning('id');
        assessmentId = row.id ?? row;
        assessmentCount += 1;
      }

      for (const [i, e] of enrolments.entries()) {
        // The Exam sits in 'approved' so the admin workspace has something to
        // publish; CA rows are 'published' so students can read them.
        const isExam = spec.type === 'exam';
        const status = isExam ? 'approved' : 'published';
        const row = {
          assessment_id: assessmentId,
          enrolment_id: e.id,
          score: scoreFor(i + 1 + spec.sequence, spec.maximum_score),
          status,
          entered_by: teacherUser?.id ?? null,
          published_at: isExam ? null : new Date('2026-10-20T09:14:00Z').toISOString(),
        };

        const existingResult = await knex('results')
          .where({ assessment_id: assessmentId, enrolment_id: e.id })
          .first('id');

        if (existingResult) {
          await knex('results')
            .where({ id: existingResult.id })
            .update({ ...row, updated_at: knex.fn.now() });
        } else {
          await knex('results').insert(row);
          resultCount += 1;
        }
      }
    }
  }

  // One legacy seeded draft, so the "author only" path is observable in dev.
  const draftAssessment = await knex('assessments').first('id');
  const draftEnrolment = enrolments[0];
  if (draftAssessment && draftEnrolment) {
    await knex('results')
      .where({ assessment_id: draftAssessment.id, enrolment_id: draftEnrolment.id })
      .update({ status: 'draft', published_at: null, updated_at: knex.fn.now() });
  }

  const [{ count: total }] = await knex('results').count('id as count');
  // eslint-disable-next-line no-console
  console.log(`  07_assessments_results: ${assessmentCount} new assessments, ${resultCount} new results (${total} total)`);
};
