const db = require("../db/db");
class AssignmentRepository {
  map(row) {
    return {
      id: row.id,
      teacher: {
        id: row.teacher_id,
        name: [row.teacher_first_name, row.teacher_last_name].filter(Boolean).join(" "),
      },
      class: { id: row.class_id, name: row.class_name },
      subject: { id: row.subject_id, name: row.subject_name },
      term: { id: row.term_id, name: row.term_name },
      isPrimary: row.is_primary,
    };
  }

  list(teacherId, filters = {}) {
    const q = db("teaching_assignments as ta")
      .join("teachers as t", "t.id", "ta.teacher_id")
      .join("classes as c", "c.id", "ta.class_id")
      .join("subjects as s", "s.id", "ta.subject_id")
      .join("terms as tr", "tr.id", "ta.term_id")
      .select("ta.*", "t.first_name as teacher_first_name", "t.last_name as teacher_last_name",
        "c.name as class_name", "s.code as subject_code", "s.name as subject_name",
        "tr.name as term_name", "tr.session_id");
    if (teacherId) q.where("ta.teacher_id", teacherId);
    if (filters.termId) q.where("ta.term_id", filters.termId);
    if (filters.classId) q.where("ta.class_id", filters.classId);
    return q.orderBy("tr.start_date", "desc").then((rows) => rows.map((row) => this.map(row)));
  }
  async create(data) {
    const [row] = await db("teaching_assignments").insert(data).returning("*");
    return this.list(null, { classId: row.class_id, termId: row.term_id })
      .then((rows) => rows.find((item) => item.id === row.id));
  }
  remove(id) { return db("teaching_assignments").where({ id }).del(); }
  roster(id) {
    return db("enrolments as e").join("students as s", "s.id", "e.student_id")
      .join("teaching_assignments as ta", "ta.class_id", "e.class_id")
      .join("terms as tr", "tr.id", "ta.term_id")
      .where("ta.id", id).andWhere("e.status", "active")
      .andWhereRaw("e.session_id = tr.session_id").select("s.*", "e.id as enrolment_id");
  }
}
module.exports = AssignmentRepository;
