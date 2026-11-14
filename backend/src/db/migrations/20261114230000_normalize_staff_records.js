/**
 * Normalize personnel records away from authentication accounts.
 *
 * `staff` is the general employment record. `teachers` remains the
 * teaching-specific extension used by academic foreign keys. System roles in
 * `roles` remain separate from employment roles in `staff_roles`.
 */

exports.up = async function up(knex) {
  await knex.schema.createTable('staff_roles', (t) => {
    t.increments('id').primary();
    t.text('name').notNullable().unique();
    t.text('description');
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex('staff_roles').insert([
    { name: 'teacher', description: 'Teaching personnel' },
    { name: 'cleaner', description: 'Cleaning and facilities personnel' },
    { name: 'admin', description: 'School administration personnel' },
    { name: 'bursar', description: 'Finance and bursary personnel' },
  ]);

  await knex.schema.createTable('staff', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').unique().references('id').inTable('users').onDelete('SET NULL');
    t.text('first_name').notNullable();
    t.text('middle_name');
    t.text('last_name').notNullable();
    t.text('staff_number').notNullable().unique();
    t.text('phone');
    t.date('employment_date');
    t.text('status').notNullable().defaultTo('active');
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
  await knex.raw("ALTER TABLE staff ADD CONSTRAINT staff_status_check CHECK (status IN ('active', 'on_leave', 'inactive'))");

  await knex.schema.createTable('staff_role_assignments', (t) => {
    t.uuid('staff_id').notNullable().references('id').inTable('staff').onDelete('CASCADE');
    t.integer('staff_role_id').notNullable().references('id').inTable('staff_roles').onDelete('RESTRICT');
    t.date('started_at').notNullable().defaultTo(knex.fn.now());
    t.date('ended_at');
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.primary(['staff_id', 'staff_role_id', 'started_at']);
  });
  await knex.raw('CREATE INDEX staff_role_assignments_role_idx ON staff_role_assignments (staff_role_id)');

  // Preserve the existing staff profile records, including admin records.
  await knex.raw(`
    INSERT INTO staff (user_id, first_name, middle_name, last_name, staff_number, phone, employment_date, status, created_at, updated_at)
    SELECT user_id, first_name, middle_name, last_name,
      'STF/' || to_char(created_at, 'YYYY') || '/' || lpad(row_number() OVER (ORDER BY created_at)::text, 4, '0'),
      phone, NULL, 'active', created_at, updated_at
    FROM staff_profiles
  `);

  // Teachers are staff even when their account is absent.
  await knex.raw(`
    INSERT INTO staff (user_id, first_name, middle_name, last_name, staff_number, employment_date, status, created_at, updated_at)
    SELECT t.user_id, t.first_name, t.middle_name, t.last_name, t.staff_number,
      t.employment_date, t.status, t.created_at, t.updated_at
    FROM teachers t
    WHERE NOT EXISTS (
      SELECT 1 FROM staff s
      WHERE (t.user_id IS NOT NULL AND s.user_id = t.user_id)
         OR s.staff_number = t.staff_number
    )
  `);

  await knex.schema.alterTable('teachers', (t) => {
    t.uuid('staff_id').unique().references('id').inTable('staff').onDelete('RESTRICT');
  });
  await knex.raw(`
    UPDATE teachers t
    SET staff_id = s.id
    FROM staff s
    WHERE (t.user_id IS NOT NULL AND s.user_id = t.user_id)
       OR s.staff_number = t.staff_number
  `);
  await knex.raw('ALTER TABLE teachers ALTER COLUMN staff_id SET NOT NULL');

  const teacherRole = await knex('staff_roles').where({ name: 'teacher' }).first('id');
  await knex.raw(`
    INSERT INTO staff_role_assignments (staff_id, staff_role_id, started_at)
    SELECT staff_id, ?, COALESCE(employment_date, CURRENT_DATE)
    FROM teachers
    ON CONFLICT DO NOTHING
  `, [teacherRole.id]);

  const adminRole = await knex('staff_roles').where({ name: 'admin' }).first('id');
  await knex.raw(`
    INSERT INTO staff_role_assignments (staff_id, staff_role_id, started_at)
    SELECT id, ?, CURRENT_DATE FROM staff
    WHERE user_id IN (SELECT user_id FROM staff_profiles)
    ON CONFLICT DO NOTHING
  `, [adminRole.id]);

  await knex.schema.alterTable('teachers', (t) => {
    t.dropColumn('user_id');
    t.dropColumn('first_name');
    t.dropColumn('middle_name');
    t.dropColumn('last_name');
    t.dropColumn('staff_number');
  });
  await knex.schema.dropTable('staff_profiles');
};

exports.down = async function down(knex) {
  await knex.schema.alterTable('teachers', (t) => {
    t.uuid('user_id').unique().references('id').inTable('users').onDelete('SET NULL');
    t.text('first_name');
    t.text('middle_name');
    t.text('last_name');
    t.text('staff_number');
  });
  await knex.raw(`
    UPDATE teachers t
    SET user_id = s.user_id, first_name = s.first_name, middle_name = s.middle_name,
        last_name = s.last_name, staff_number = s.staff_number
    FROM staff s WHERE s.id = t.staff_id
  `);
  await knex.raw('ALTER TABLE teachers ALTER COLUMN first_name SET NOT NULL');
  await knex.raw('ALTER TABLE teachers ALTER COLUMN last_name SET NOT NULL');
  await knex.raw('ALTER TABLE teachers ALTER COLUMN staff_number SET NOT NULL');
  await knex.schema.alterTable('teachers', (t) => t.dropColumn('staff_id'));
  await knex.schema.createTable('staff_profiles', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id').notNullable().unique().references('id').inTable('users').onDelete('CASCADE');
    t.text('first_name').notNullable();
    t.text('middle_name');
    t.text('last_name').notNullable();
    t.text('phone');
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
  await knex.raw(`
    INSERT INTO staff_profiles (user_id, first_name, middle_name, last_name, phone)
    SELECT user_id, first_name, middle_name, last_name, phone
    FROM staff WHERE user_id IS NOT NULL
  `);
  await knex.schema.dropTable('staff_role_assignments');
  await knex.schema.dropTable('staff_roles');
  await knex.schema.dropTable('staff');
};
