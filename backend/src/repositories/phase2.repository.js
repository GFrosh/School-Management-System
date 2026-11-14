const db = require("../db/db");
const StudentRepository = require("./student.repository");

class Phase2Repository {
  constructor() { this.students = new StudentRepository(); }
  listTeachers() {
    return db("teachers as t")
      .join("staff as s", "s.id", "t.staff_id")
      .leftJoin("users as u", "s.user_id", "u.id")
      .orderBy("s.last_name").orderBy("s.first_name")
      .select("t.id", "t.staff_id", "t.employment_date", "s.user_id", "s.first_name", "s.middle_name", "s.last_name", "s.staff_number", "s.status", "u.email");
  }
  async createTeacher(data) {
    return db.transaction(async (trx) => {
      const employmentDate = data.employment_date ? new Date(data.employment_date) : new Date();
      const year = employmentDate.getUTCFullYear();
      await trx.raw("select pg_advisory_xact_lock(hashtext(?))", [`teacher-staff-${year}`]);
      const [{ count }] = await trx("staff")
        .whereBetween("employment_date", [`${year}-01-01`, `${year + 1}-01-01`])
        .count("id as count");
      const staffNumber = `STF/${year}/${String(Number(count) + 1).padStart(4, "0")}`;
      const [staff] = await trx("staff").insert({
        first_name: data.first_name,
        middle_name: data.middle_name || null,
        last_name: data.last_name,
        employment_date: data.employment_date || new Date(),
        status: data.status || "active",
        user_id: data.user_id || null,
        staff_number: staffNumber,
      }).returning("*");
      const [row] = await trx("teachers").insert({
        staff_id: staff.id,
        employment_date: staff.employment_date,
        status: staff.status,
      }).returning("*");
      const teacherRole = await trx("staff_roles").where({ name: "teacher" }).first("id");
      await trx("staff_role_assignments").insert({ staff_id: staff.id, staff_role_id: teacherRole.id, started_at: staff.employment_date });
      return { ...row, ...staff };
    });
  }
  async updateTeacher(id, data) {
    return db.transaction(async (trx) => {
      const teacher = await trx("teachers").where({ id }).first();
      if (!teacher) return null;
      const staffFields = ["first_name", "middle_name", "last_name", "user_id", "status"];
      const staffData = Object.fromEntries(staffFields.filter((field) => data[field] !== undefined).map((field) => [field, data[field]]));
      if (data.employment_date !== undefined) staffData.employment_date = data.employment_date;
      if (Object.keys(staffData).length) await trx("staff").where({ id: teacher.staff_id }).update({ ...staffData, updated_at: trx.fn.now() });
      const teacherData = {};
      if (data.employment_date !== undefined) teacherData.employment_date = data.employment_date;
      if (data.status !== undefined) teacherData.status = data.status;
      const [row] = await trx("teachers").where({ id }).update({ ...teacherData, updated_at: trx.fn.now() }).returning("*");
      if (!row) return null;
      const staff = await trx("staff").where({ id: teacher.staff_id }).first();
      return { ...row, ...staff };
    });
  }
  async createStudent(data) {
    return db.transaction(async (trx) => {
      const admissionDate = data.admission_date ? new Date(data.admission_date) : new Date();
      const year = admissionDate.getUTCFullYear();
      await trx.raw("SELECT pg_advisory_xact_lock(hashtext(?))", [`student-admission-${year}`]);
      const latest = await trx("students")
        .whereLike("admission_number", `SMS/${year}/%`)
        .max({ sequence: trx.raw("CAST(SUBSTRING(admission_number FROM 10) AS INTEGER)") })
        .first();
      const sequence = Number(latest?.sequence || 0) + 1;
      const admission_number = `SMS/${year}/${String(sequence).padStart(4, "0")}`;
      const [row] = await trx("students").insert({
        ...data,
        admission_number,
        admission_date: data.admission_date || admissionDate,
      }).returning("*");
      return row;
    });
  }
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
