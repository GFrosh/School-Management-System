const db = require("../db/db");

class TeacherRepository {
    getByUserId(id) {
        return db("teachers as t")
            .join("staff as s", "s.id", "t.staff_id")
            .where("s.user_id", id)
            .select("t.*", "s.user_id", "s.first_name", "s.middle_name", "s.last_name", "s.staff_number", "s.status")
            .first();
    }
}

module.exports = TeacherRepository;
