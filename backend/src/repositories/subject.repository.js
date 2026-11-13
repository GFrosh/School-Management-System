const db = require("../db/db");
class SubjectRepository {
  map(row) {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      is_core: row.is_core,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
  list() { return db("subjects").orderBy("name").then((rows) => rows.map((row) => this.map(row))); }
  async create(data) {
    const [row] = await db("subjects").insert(data).returning("*");
    return this.map(row);
  }
  async remove(id) { return db("subjects").where({ id }).del(); }
}
module.exports = SubjectRepository;
