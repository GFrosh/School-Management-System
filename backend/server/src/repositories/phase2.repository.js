const db = require("../db/db");
const StudentRepository = require("./student.repository");

class Phase2Repository {
  constructor() { this.students = new StudentRepository(); }
  listTeachers() { return db("teachers").orderBy("last_name").orderBy("first_name"); }
  async createTeacher(data) { const [row] = await db("teachers").insert(data).returning("*"); return row; }
  async updateTeacher(id, data) { const [row] = await db("teachers").where({ id }).update({ ...data, updated_at: db.fn.now() }).returning("*"); return row; }
  async createStudent(data) { const [row] = await db("students").insert(data).returning("*"); return row; }
  async updateStudent(id, data) { const [row] = await db("students").where({ id }).update({ ...data, updated_at: db.fn.now() }).returning("*"); return row; }
  async createEnrolment(data) { const [row] = await db("enrolments").insert(data).returning("*"); return row; }
  async closeEnrolment(id, data) { const [row] = await db("enrolments").where({ id }).update({ ...data, updated_at: db.fn.now() }).returning("*"); return row; }
  async listPromotions(sessionId) {
    return db("enrolments as e").join("students as s", "s.id", "e.student_id")
      .join("classes as c", "c.id", "e.class_id").where("e.session_id", sessionId)
      .select("e.*", "s.first_name", "s.last_name", "s.admission_number", "c.name as class_name");
  }
  async promote(data) {
    return db.transaction(async trx => {
      const [row] = await trx("enrolments").insert(data).returning("*");
      return row;
    });
  }
  async promoteDecisions(sessionId, decisions) {
    return db.transaction(async (trx) => {
      const result = { sessionId, promoted: 0, repeated: 0, graduated: 0, skipped: [] };
      for (const decision of decisions) {
        const current = await trx("enrolments")
          .where({ student_id: decision.studentId, status: "active" })
          .whereNot("session_id", sessionId)
          .orderBy("enrolled_on", "desc")
          .first();

        if (decision.outcome === "graduated") {
          await trx("students")
            .where({ id: decision.studentId })
            .update({ status: "graduated", updated_at: trx.fn.now() });
          if (current) {
            await trx("enrolments")
              .where({ id: current.id })
              .update({ status: "graduated", ended_on: trx.fn.now(), updated_at: trx.fn.now() });
          }
          result.graduated += 1;
          continue;
        }

        if (!decision.toClassId || !current) {
          result.skipped.push(decision.studentId);
          continue;
        }

        await trx("enrolments")
          .where({ id: current.id })
          .update({ status: decision.outcome, ended_on: trx.fn.now(), updated_at: trx.fn.now() });
        await trx("enrolments").insert({
          student_id: decision.studentId,
          class_id: decision.toClassId,
          session_id: sessionId,
          status: "active",
          enrolled_on: trx.fn.now(),
        });
        result[decision.outcome] += 1;
      }
      return result;
    });
  }
  updateUserStatus(id, status) { return db("users").where({ id }).update({ status, updated_at: db.fn.now() }); }
}
module.exports = Phase2Repository;
