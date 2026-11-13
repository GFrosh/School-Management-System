const db = require("../db/db");
class GuardianRepository {
  list(studentId) {
    return db("student_guardians as sg").join("parents as p", "p.id", "sg.parent_id")
      .where("sg.student_id", studentId)
      .select("sg.*", "p.first_name", "p.middle_name", "p.last_name", "p.phone", "p.email");
  }
  async link(studentId, data) {
    const [row] = await db("student_guardians").insert({ ...data, student_id: studentId }).returning("*"); return row;
  }
  unlink(studentId, parentId) { return db("student_guardians").where({ student_id: studentId, parent_id: parentId }).del(); }
}
module.exports = GuardianRepository;
