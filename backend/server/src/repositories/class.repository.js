const db = require("../db/db");

class ClassRepository {
    async getClasses() {
        return await db("classes");
    }
    async createClass(data) {
        return await db("classes").insert(data);
    }
}

module.exports = ClassRepository;
