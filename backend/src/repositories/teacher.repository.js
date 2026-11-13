const db = require("../db/db");

class TeacherRepository {
    getByUserId(id) {
        return db("teachers").where({ user_id: id }).first();
    }
}

module.exports = TeacherRepository;
