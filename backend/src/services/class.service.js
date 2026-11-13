const ClassRepository = require("../repositories/class.repository");
const TeacherRepository = require("../repositories/teacher.repository");
const ApiResponse = require("../utils/Response");
const classRepo = new ClassRepository();
const teacherRepo = new TeacherRepository();

const ClassService = {
    get: async (user) => {
        let teacherId = null;
        if (user.roles.includes("teacher")) {
            const teacherRecord = await teacherRepo.getByUserId(user.sub);
            teacherId = teacherRecord?.id || null;
        }

        const isTeacherOnly = user.roles.includes("teacher") && !user.roles.includes("admin");
        if (isTeacherOnly) {
            if (!teacherId) {
                return [];
            }
        }

        return await classRepo.getClasses(teacherId);
    },
    new: async (data) => {
        return classRepo.createClass({
            name: data.name,
            level: data.level,
            class_teacher_id: data.classTeacherId ?? null,
        });
    },
    update: async (id, data) => {
        const row = await classRepo.updateClass(id, {
            name: data.name,
            level: data.level,
            class_teacher_id: data.classTeacherId,
        });
        if (!row) {
            throw ApiResponse.error(404, "NOT_FOUND", "Class not found");
        }
        return row;
    }
}

module.exports = ClassService;
