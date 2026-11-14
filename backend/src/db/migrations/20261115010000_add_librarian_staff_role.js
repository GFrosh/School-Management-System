exports.up = async function up(knex) {
  await knex('staff_roles').insert({
    name: 'librarian',
    description: 'Library and learning-resource personnel',
  }).onConflict('name').ignore();
};

exports.down = async function down(knex) {
  await knex('staff_roles').where({ name: 'librarian' }).del();
};
