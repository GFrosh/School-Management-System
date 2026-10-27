/**
 * Initial schema — School Management System, Phase 1.
 *
 * Source of truth: docs/requirements-and-data-model.md
 *   §5.5 entity dictionary (19 tables)
 *   §5.6 constraint register C1–C12
 *   §7   API contract (status vocabularies the endpoints rely on)
 *
 * Notes
 *  - Requires PostgreSQL >= 13 for gen_random_uuid() and the citext extension.
 *  - UUID primary keys everywhere except `roles`, which is a four-row lookup table.
 *  - snake_case in the database; the repository layer maps to camelCase on the wire (§7.1).
 *  - Every table carries created_at / updated_at (timestamptz) as §5.5 requires.
 */

/* eslint-disable func-names */

// Status vocabularies, kept in one place so C9-style CHECKs cannot drift.
const USER_STATUS = ['active', 'suspended', 'deactivated'];
const STUDENT_STATUS = ['active', 'withdrawn', 'graduated'];
const TEACHER_STATUS = ['active', 'on_leave', 'inactive'];
const ENROLMENT_STATUS = ['active', 'promoted', 'repeated', 'transferred', 'withdrawn'];
const RESULT_STATUS = ['draft', 'submitted', 'approved', 'published', 'correction_pending'];
const REVISION_STATUS = ['pending', 'approved', 'rejected'];
const ATTENDANCE_STATUS = ['present', 'absent', 'late', 'excused'];
const REGISTER_STATUS = ['draft', 'submitted'];
const ATTENDANCE_RELATIONSHIP = ['father', 'mother', 'guardian', 'other'];

const quoted = (values) => values.map((v) => `'${v}'`).join(', ');

// §5.5 requires timestamptz on every table, including created_at / updated_at.
const stamps = (knex, t) => {
  t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function up(knex) {
  // ------------------------------------------------------------------ extensions
  await knex.raw('CREATE EXTENSION IF NOT EXISTS citext');

  // ============================================================ A. IDENTITY
  // ---------------------------------------------------------------- roles
  // Lookup table: four roles, integer key. `name` is the value the API returns
  // in user.roles (§7.3), so it is unique and not nullable.
  await knex.schema.createTable('roles', (t) => {
    t.increments('id').primary();
    t.text('name').notNullable().unique();
    t.text('description');
  });

  await knex('roles').insert([
    { name: 'admin', description: 'Administrator: manages people, structure, assignments and publication' },
    { name: 'teacher', description: 'Teacher: attendance and scores for assigned classes only' },
    { name: 'student', description: 'Student: own profile, attendance and published results' },
    { name: 'parent', description: 'Guardian: linked children only, published results only' },
  ]);

  // ---------------------------------------------------------------- users
  // Credentials and account state only. No school data lives here (§3.1).
  await knex.schema.createTable('users', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.specificType('email', 'citext').notNullable().unique();
    t.text('password_hash').notNullable();
    t.text('status').notNullable().defaultTo('active');
    // §7.1 rate limiting (5 attempts / 15 min) and §7.2 ACCOUNT_LOCKED need state.
    t.integer('failed_attempts').notNullable().defaultTo(0);
    t.timestamp('locked_until', { useTz: true });
    t.timestamp('last_login_at', { useTz: true });
    stamps(knex, t);
  });
  await knex.raw(
    `ALTER TABLE users ADD CONSTRAINT users_status_check CHECK (status IN (${quoted(USER_STATUS)}))`,
  );

  // ---------------------------------------------------------------- user_roles
  // M:N (§3.2). Additive capability; data scope is still derived per request.
  await knex.schema.createTable('user_roles', (t) => {
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.integer('role_id').notNullable().references('id').inTable('roles').onDelete('RESTRICT');
    t.timestamp('granted_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.primary(['user_id', 'role_id']);
  });
  await knex.raw('CREATE INDEX user_roles_role_id_idx ON user_roles (role_id)');

  // ---------------------------------------------------------------- refresh_tokens
  // Only the hash is stored, so a dump does not leak live sessions (§5.2).
  await knex.schema.createTable('refresh_tokens', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.text('token_hash').notNullable().unique();
    t.timestamp('expires_at', { useTz: true }).notNullable();
    t.timestamp('revoked_at', { useTz: true });
    stamps(knex, t);
  });
  await knex.raw('CREATE INDEX refresh_tokens_user_id_idx ON refresh_tokens (user_id)');

  // ---------------------------------------------------------------- students
  // Surrogate PK + nullable unique account link (§3.1). A pupil exists before a login.
  await knex.schema.createTable('students', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').unique().references('id').inTable('users').onDelete('SET NULL');
    t.text('admission_number').notNullable().unique();
    t.text('first_name').notNullable();
    t.text('middle_name');
    t.text('last_name').notNullable();
    t.date('date_of_birth').notNullable();
    t.text('gender');
    t.date('admission_date');
    t.text('status').notNullable().defaultTo('active');
    stamps(knex, t);
  });
  await knex.raw(
    `ALTER TABLE students ADD CONSTRAINT students_status_check CHECK (status IN (${quoted(STUDENT_STATUS)}))`,
  );
  await knex.raw(
    "ALTER TABLE students ADD CONSTRAINT students_gender_check CHECK (gender IS NULL OR gender IN ('male','female','other'))",
  );
  await knex.raw(
    'CREATE INDEX students_name_idx ON students (lower(last_name), lower(first_name))',
  );

  // ---------------------------------------------------------------- teachers
  await knex.schema.createTable('teachers', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').unique().references('id').inTable('users').onDelete('SET NULL');
    t.text('staff_number').notNullable().unique();
    t.text('first_name').notNullable();
    t.text('middle_name');
    t.text('last_name').notNullable();
    t.date('employment_date');
    t.text('status').notNullable().defaultTo('active');
    stamps(knex, t);
  });
  await knex.raw(
    `ALTER TABLE teachers ADD CONSTRAINT teachers_status_check CHECK (status IN (${quoted(TEACHER_STATUS)}))`,
  );

  // ---------------------------------------------------------------- parents
  await knex.schema.createTable('parents', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').unique().references('id').inTable('users').onDelete('SET NULL');
    t.text('first_name').notNullable();
    t.text('last_name').notNullable();
    t.text('phone');
    // Contact address may differ from the login address, so it is not unique.
    t.specificType('email', 'citext');
    stamps(knex, t);
  });

  // ---------------------------------------------------------------- student_guardians
  // M:N — a guardian may have several children, a child may have several guardians (§3.5).
  await knex.schema.createTable('student_guardians', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('student_id').notNullable().references('id').inTable('students').onDelete('CASCADE');
    t.uuid('parent_id').notNullable().references('id').inTable('parents').onDelete('CASCADE');
    t.text('relationship');
    t.boolean('is_primary').notNullable().defaultTo(false);
    stamps(knex, t);
    // C12 — the same guardian cannot be linked to the same child twice.
    t.unique(['student_id', 'parent_id']);
  });
  await knex.raw(
    `ALTER TABLE student_guardians ADD CONSTRAINT student_guardians_relationship_check
       CHECK (relationship IS NULL OR relationship IN (${quoted(ATTENDANCE_RELATIONSHIP)}))`,
  );
  await knex.raw('CREATE INDEX student_guardians_parent_id_idx ON student_guardians (parent_id)');

  // ==================================================== B. ACADEMIC STRUCTURE
  // ---------------------------------------------------------------- academic_sessions
  await knex.schema.createTable('academic_sessions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.text('name').notNullable().unique(); // '2026/2027'
    t.date('start_date').notNullable();
    t.date('end_date').notNullable();
    t.boolean('is_current').notNullable().defaultTo(false);
    stamps(knex, t);
  });
  await knex.raw(
    'ALTER TABLE academic_sessions ADD CONSTRAINT academic_sessions_dates_check CHECK (end_date > start_date)',
  );
  // §7.4 — "only one true at a time".
  await knex.raw(
    'CREATE UNIQUE INDEX academic_sessions_single_current ON academic_sessions (is_current) WHERE is_current = TRUE',
  );

  // ---------------------------------------------------------------- terms
  await knex.schema.createTable('terms', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('session_id').notNullable().references('id').inTable('academic_sessions').onDelete('CASCADE');
    t.smallint('sequence').notNullable(); // 1 = First, 2 = Second, 3 = Third
    t.text('name').notNullable();
    t.date('start_date').notNullable();
    t.date('end_date').notNullable();
    stamps(knex, t);
    // C11 — three ordered terms per session, no duplicates.
    t.unique(['session_id', 'sequence']);
  });
  await knex.raw(
    'ALTER TABLE terms ADD CONSTRAINT terms_sequence_check CHECK (sequence BETWEEN 1 AND 3)',
  );
  await knex.raw('ALTER TABLE terms ADD CONSTRAINT terms_dates_check CHECK (end_date > start_date)');

  // ---------------------------------------------------------------- subjects
  await knex.schema.createTable('subjects', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.text('code').notNullable().unique(); // 'MTH'
    t.text('name').notNullable();
    t.boolean('is_core').notNullable().defaultTo(true);
    stamps(knex, t);
  });

  // ---------------------------------------------------------------- classes
  // A stable definition (JSS1A), NOT per session (§5.3).
  await knex.schema.createTable('classes', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.text('name').notNullable().unique();
    t.smallint('level').notNullable();
    // Convenience pointer only — never the authorization path for teaching (§5.3).
    t.uuid('class_teacher_id').references('id').inTable('teachers').onDelete('SET NULL');
    stamps(knex, t);
  });
  await knex.raw('ALTER TABLE classes ADD CONSTRAINT classes_level_check CHECK (level BETWEEN 1 AND 12)');
  await knex.raw('CREATE INDEX classes_class_teacher_id_idx ON classes (class_teacher_id)');

  // ---------------------------------------------------------------- enrolments
  // The placement fact. Rows are closed, never overwritten (§3.3, §4.1–4.2).
  await knex.schema.createTable('enrolments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('student_id').notNullable().references('id').inTable('students').onDelete('RESTRICT');
    t.uuid('class_id').notNullable().references('id').inTable('classes').onDelete('RESTRICT');
    t.uuid('session_id').notNullable().references('id').inTable('academic_sessions').onDelete('RESTRICT');
    t.text('status').notNullable().defaultTo('active');
    t.date('enrolled_on').notNullable().defaultTo(knex.raw('CURRENT_DATE'));
    t.date('ended_on');
    stamps(knex, t);
  });
  await knex.raw(
    `ALTER TABLE enrolments ADD CONSTRAINT enrolments_status_check CHECK (status IN (${quoted(ENROLMENT_STATUS)}))`,
  );
  // C10 — a placement cannot end before it began.
  await knex.raw(
    'ALTER TABLE enrolments ADD CONSTRAINT enrolments_dates_check CHECK (ended_on IS NULL OR ended_on >= enrolled_on)',
  );
  // C1 — one ACTIVE placement per student per session; closed rows are unconstrained.
  await knex.raw(
    `CREATE UNIQUE INDEX enrolments_one_active_per_session
       ON enrolments (student_id, session_id) WHERE status = 'active'`,
  );
  // C1b — a live row (active/promoted/repeated) may not share a session with another (§3.3).
  await knex.raw(
    `CREATE UNIQUE INDEX enrolments_one_live_per_session
       ON enrolments (student_id, session_id)
       WHERE status IN ('active', 'promoted', 'repeated')`,
  );
  await knex.raw('CREATE INDEX enrolments_session_class_idx ON enrolments (session_id, class_id)');
  await knex.raw('CREATE INDEX enrolments_student_idx ON enrolments (student_id)');

  // ---------------------------------------------------------------- teaching_assignments
  // Who teaches what, where, when — the unit of teaching authority (§3.2, FR-05).
  await knex.schema.createTable('teaching_assignments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('teacher_id').notNullable().references('id').inTable('teachers').onDelete('RESTRICT');
    t.uuid('class_id').notNullable().references('id').inTable('classes').onDelete('RESTRICT');
    t.uuid('subject_id').notNullable().references('id').inTable('subjects').onDelete('RESTRICT');
    t.uuid('term_id').notNullable().references('id').inTable('terms').onDelete('RESTRICT');
    t.boolean('is_primary').notNullable().defaultTo(true);
    stamps(knex, t);
    // Target of the composite FK from assessments (C7).
    t.unique(['id', 'term_id']);
  });
  // C4 — one accountable teacher per class/subject/term, co-teaching still allowed.
  await knex.raw(
    `CREATE UNIQUE INDEX teaching_assignments_one_primary
       ON teaching_assignments (class_id, subject_id, term_id) WHERE is_primary = TRUE`,
  );
  await knex.raw(
    'CREATE INDEX teaching_assignments_teacher_term_idx ON teaching_assignments (teacher_id, term_id)',
  );

  // ====================================================== C. ACADEMIC RECORDS
  // ---------------------------------------------------------------- assessments
  await knex.schema.createTable('assessments', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('teaching_assignment_id').notNullable();
    // Redundant on purpose: kept consistent with the assignment by C7 below.
    t.uuid('term_id').notNullable();
    t.text('name').notNullable(); // 'CA1', 'Exam'
    t.text('type').notNullable(); // ca | exam | project
    t.decimal('maximum_score', 5, 2).notNullable();
    t.decimal('weight', 5, 2).notNullable();
    t.smallint('sequence').notNullable().defaultTo(1);
    stamps(knex, t);
  });
  // C7 — the term on the assessment can never disagree with the assignment's term.
  await knex.raw(
    `ALTER TABLE assessments ADD CONSTRAINT assessments_assignment_term_fk
       FOREIGN KEY (teaching_assignment_id, term_id)
       REFERENCES teaching_assignments (id, term_id) ON DELETE RESTRICT`,
  );
  await knex.raw(
    "ALTER TABLE assessments ADD CONSTRAINT assessments_type_check CHECK (type IN ('ca','exam','project'))",
  );
  // C8 — no assessment worth zero marks.
  await knex.raw(
    'ALTER TABLE assessments ADD CONSTRAINT assessments_marks_check CHECK (maximum_score > 0 AND weight > 0)',
  );
  await knex.raw('CREATE INDEX assessments_assignment_idx ON assessments (teaching_assignment_id)');

  // ---------------------------------------------------------------- results
  await knex.schema.createTable('results', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('assessment_id').notNullable().references('id').inTable('assessments').onDelete('RESTRICT');
    t.uuid('enrolment_id').notNullable().references('id').inTable('enrolments').onDelete('RESTRICT');
    t.decimal('score', 5, 2); // NULL = not yet entered
    t.text('status').notNullable().defaultTo('draft');
    t.uuid('entered_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('published_at', { useTz: true });
    stamps(knex, t);
    // C2 — one score per pupil per assessment.
    t.unique(['assessment_id', 'enrolment_id']);
  });
  // C9 — illegal states rejected by the database, not only by TypeScript.
  await knex.raw(
    `ALTER TABLE results ADD CONSTRAINT results_status_check CHECK (status IN (${quoted(RESULT_STATUS)}))`,
  );
  await knex.raw('ALTER TABLE results ADD CONSTRAINT results_score_nonnegative CHECK (score IS NULL OR score >= 0)');
  await knex.raw('CREATE INDEX results_enrolment_idx ON results (enrolment_id)');
  // A published row must know when it was published; an unpublished one must not claim to be.
  await knex.raw(
    `ALTER TABLE results ADD CONSTRAINT results_published_at_check
       CHECK ((status = 'published' AND published_at IS NOT NULL)
           OR (status <> 'published' AND published_at IS NULL))`,
  );

  // C3 — score <= assessment.maximum_score. A CHECK cannot subquery another table,
  // so this is a trigger (§5.6).
  await knex.raw(`
    CREATE OR REPLACE FUNCTION enforce_score_within_maximum() RETURNS trigger AS $$
    DECLARE
      max_score numeric(5,2);
    BEGIN
      IF NEW.score IS NULL THEN
        RETURN NEW;
      END IF;

      SELECT maximum_score INTO max_score FROM assessments WHERE id = NEW.assessment_id;

      IF max_score IS NULL THEN
        RAISE EXCEPTION 'Assessment % does not exist', NEW.assessment_id
          USING ERRCODE = 'foreign_key_violation';
      END IF;

      IF NEW.score < 0 THEN
        RAISE EXCEPTION 'Score cannot be negative (got %)', NEW.score
          USING ERRCODE = 'check_violation';
      END IF;

      IF NEW.score > max_score THEN
        RAISE EXCEPTION 'Score % exceeds the maximum of % for assessment %',
          NEW.score, max_score, NEW.assessment_id
          USING ERRCODE = 'check_violation';
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
  await knex.raw(`
    CREATE TRIGGER results_score_within_maximum
    BEFORE INSERT OR UPDATE OF score, assessment_id ON results
    FOR EACH ROW EXECUTE FUNCTION enforce_score_within_maximum();
  `);

  // ---------------------------------------------------------------- result_revisions
  // Append-only (§3.5): no update or delete path exists in the API.
  await knex.schema.createTable('result_revisions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('result_id').notNullable().references('id').inTable('results').onDelete('RESTRICT');
    t.decimal('previous_score', 5, 2).notNullable();
    t.decimal('new_score', 5, 2).notNullable();
    t.text('reason').notNullable();
    t.text('status').notNullable().defaultTo('pending');
    t.uuid('requested_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.uuid('approved_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('decided_at', { useTz: true });
    stamps(knex, t);
  });
  await knex.raw(
    `ALTER TABLE result_revisions ADD CONSTRAINT result_revisions_status_check
       CHECK (status IN (${quoted(REVISION_STATUS)}))`,
  );
  // §3.2 — the approver must be someone other than the requester.
  await knex.raw(
    `ALTER TABLE result_revisions ADD CONSTRAINT result_revisions_separation_check
       CHECK (approved_by IS NULL OR approved_by <> requested_by)`,
  );
  await knex.raw('CREATE INDEX result_revisions_result_idx ON result_revisions (result_id)');

  // ---------------------------------------------------------------- attendance_registers
  // One roll call: assignment + date + period (§3.4).
  await knex.schema.createTable('attendance_registers', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('teaching_assignment_id')
      .notNullable()
      .references('id')
      .inTable('teaching_assignments')
      .onDelete('RESTRICT');
    t.date('attendance_date').notNullable();
    t.smallint('period_no').notNullable().defaultTo(1);
    t.text('status').notNullable().defaultTo('draft');
    t.uuid('submitted_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('submitted_at', { useTz: true });
    stamps(knex, t);
    // C5 — one register per lesson.
    t.unique(['teaching_assignment_id', 'attendance_date', 'period_no']);
  });
  await knex.raw(
    `ALTER TABLE attendance_registers ADD CONSTRAINT attendance_registers_status_check
       CHECK (status IN (${quoted(REGISTER_STATUS)}))`,
  );
  await knex.raw(
    'ALTER TABLE attendance_registers ADD CONSTRAINT attendance_registers_period_check CHECK (period_no >= 0)',
  );
  await knex.raw(
    'CREATE INDEX attendance_registers_date_idx ON attendance_registers (attendance_date)',
  );

  // ---------------------------------------------------------------- attendance_records
  await knex.schema.createTable('attendance_records', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('register_id').notNullable().references('id').inTable('attendance_registers').onDelete('CASCADE');
    t.uuid('enrolment_id').notNullable().references('id').inTable('enrolments').onDelete('RESTRICT');
    t.text('status').notNullable();
    stamps(knex, t);
    // C6 — one mark per pupil per register.
    t.unique(['register_id', 'enrolment_id']);
  });
  await knex.raw(
    `ALTER TABLE attendance_records ADD CONSTRAINT attendance_records_status_check
       CHECK (status IN (${quoted(ATTENDANCE_STATUS)}))`,
  );
  // §3.4 — the history query is "this pupil, this date range".
  await knex.raw('CREATE INDEX attendance_records_enrolment_idx ON attendance_records (enrolment_id)');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function down(knex) {
  // Reverse dependency order. dropTableIfExists so a partial failure can be
  // rolled back without manual cleanup.
  await knex.schema.dropTableIfExists('attendance_records');
  await knex.schema.dropTableIfExists('attendance_registers');
  await knex.schema.dropTableIfExists('result_revisions');
  // Dropping the table removes its trigger, so the function can go next.
  await knex.schema.dropTableIfExists('results');
  await knex.raw('DROP FUNCTION IF EXISTS enforce_score_within_maximum()');
  await knex.schema.dropTableIfExists('assessments');
  await knex.schema.dropTableIfExists('teaching_assignments');
  await knex.schema.dropTableIfExists('enrolments');
  await knex.schema.dropTableIfExists('classes');
  await knex.schema.dropTableIfExists('subjects');
  await knex.schema.dropTableIfExists('terms');
  await knex.schema.dropTableIfExists('academic_sessions');
  await knex.schema.dropTableIfExists('student_guardians');
  await knex.schema.dropTableIfExists('parents');
  await knex.schema.dropTableIfExists('teachers');
  await knex.schema.dropTableIfExists('students');
  await knex.schema.dropTableIfExists('refresh_tokens');
  await knex.schema.dropTableIfExists('user_roles');
  await knex.schema.dropTableIfExists('users');
  await knex.schema.dropTableIfExists('roles');

  // Best effort: the extension may be shared with another schema, so a failure
  // here must not abort the rollback.
  await knex.raw('DROP EXTENSION IF EXISTS citext').catch(() => {});
};

// One transaction for the whole migration: a half-created schema is worse than none.
exports.config = { transaction: true };
