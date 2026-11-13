const db = require("../db/db");

class ClassRepository {
    async getClasses(teacherId) {
        const query = db("classes as c")
            .leftJoin("teachers as t", "t.id", "c.class_teacher_id")
            .leftJoin("enrolments as e", function () {
                this.on("e.class_id", "c.id")
                    .andOn("e.status", db.raw("?", ["active"]))
                    .andOn(
                        "e.session_id",
                        "=",
                        db.raw("(select id from academic_sessions where is_current = true limit 1)"),
                    );
            })
            .select(
                "c.id",
                "c.name",
                "c.level",
                "c.class_teacher_id",
                db.raw("nullif(concat_ws(' ', t.first_name, t.last_name), '') as class_teacher_name"),
                "c.created_at",
                "c.updated_at",
                db.raw("count(distinct e.student_id)::int as headcount"),
            )
            .groupBy(
                "c.id",
                "c.name",
                "c.level",
                "c.class_teacher_id",
                "t.first_name",
                "t.last_name",
                "c.created_at",
                "c.updated_at",
            )
            .orderBy("c.level", "asc")
            .orderBy("c.name", "asc");

        if (teacherId) {
            query.whereExists(
                db("teaching_assignments as teacher_assignment")
                    .select(db.raw("1"))
                    .whereRaw("teacher_assignment.class_id = c.id")
                    .andWhere("teacher_assignment.teacher_id", teacherId),
            );
        }

        return await query;
    }
    async createClass(data) {
        const [row] = await db("classes").insert(data).returning("*");
        return row;
    }

    async updateClass(id, data) {
        const [row] = await db("classes")
            .where({ id })
            .update({ ...data, updated_at: db.fn.now() })
            .returning("*");
        return row;
    }
}

module.exports = ClassRepository;
