const db = require("../db/db");

class StudentRepository {
  // Always returns a clean, unmutated Knex instance
  #getFreshBaseQuery() {
    return db("students as s").distinct("s.*");
  }

  // 1. Isolated scoping logic
  scopeByTeacher(query, teacherId) {
    return query
      .join("enrolments as e_scope", "e_scope.student_id", "s.id")
      .join("teaching_assignments as ta", "ta.class_id", "e_scope.class_id")
      .join("terms as term_scope", "term_scope.id", "ta.term_id")
      .where("ta.teacher_id", teacherId)
      .andWhere("e_scope.status", "active")
      .andWhereRaw("e_scope.session_id = term_scope.session_id");
  }

  // 2. Isolated filtering logic
  applyFilters(query, { q, status, classId, sessionId, isTeacherOnly }) {
    if (status) {
      query.where("s.status", status);
    }

    if (q) {
      query.where((builder) => {
        builder.where("s.admission_number", "ilike", `%${q}%`)
            .orWhere(db.raw("lower(s.first_name || ' ' || s.last_name) ilike ?", `%${q.toLowerCase()}%`))
            .orWhere(db.raw("lower(s.first_name || ' ' || s.middle_name || ' ' || s.last_name) ilike ?", `%${q.toLowerCase()}%`))
            .orWhere("s.first_name", "ilike", `%${q}%`)
            .orWhere("s.last_name", "ilike", `%${q}%`);
      });
    }

    if (classId || sessionId) {
      if (!isTeacherOnly) {
        query.join("enrolments as e_filter", "e_filter.student_id", "s.id");
      }
      const enrolmentAlias = isTeacherOnly ? "e_scope" : "e_filter";

      if (classId) query.where(`${enrolmentAlias}.class_id`, classId);
      if (sessionId) query.where(`${enrolmentAlias}.session_id`, sessionId);
    }

    return query;
  }

  // 3. Execution pipeline
  async getStudentsAndCount({ filters, teacherId, isTeacherOnly, limit, offset }) {
    let query = this.#getFreshBaseQuery();

    if (isTeacherOnly) {
      query = this.scopeByTeacher(query, teacherId);
    }

    query = this.applyFilters(query, { ...filters, isTeacherOnly });

    // Execute both db hits concurrently to optimize performance
    const countQuery = query.clone().clearSelect().count("* as total").first();
    const paginatedQuery = query
      .clone()
      .orderBy("s.last_name", "asc")
      .orderBy("s.first_name", "asc")
      .limit(limit)
      .offset(offset);

    const [totalResult, data] = await Promise.all([countQuery, paginatedQuery]);
    const total = parseInt(totalResult?.total || "0", 10);

    return { data, total };
  }


  async getStudentById(studentId, teacherId, isTeacherOnly) {
    let query = this.#getFreshBaseQuery().where("s.id", studentId);

    if (isTeacherOnly) {
      query = this.scopeByTeacher(query, teacherId);
    }

    return await query.first();
  }


  async getEnrolments(studentId, teacherId, isTeacherOnly) {
    let query = db("enrolments as e")
      .select("e.*")
      .where("e.student_id", studentId);

    if (isTeacherOnly) {
      query = query
        .join("teaching_assignments as ta", "ta.class_id", "e.class_id")
        .join("terms as term_scope", "term_scope.id", "ta.term_id")
        .where("ta.teacher_id", teacherId)
        .andWhereRaw("e.session_id = term_scope.session_id");
    }

    return await query;
  }
}

module.exports = StudentRepository;
