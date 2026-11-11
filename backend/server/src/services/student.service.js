const StudentRepository = require("../repositories/student.repository");
const TeacherRepository = require("../repositories/teacher.repository");
const studentRepo = new StudentRepository();
const teacherRepo = new TeacherRepository();

const StudentService = {
    get: async (query, user) => {
        let teacherId = null;
        
        // 1. Resolve Teacher Profile ID dynamically via User ID
        if (user.roles.includes("teacher")) {
            const teacherRecord = await teacherRepo.getByUserId(user.sub);
            teacherId = teacherRecord?.id || null;
        }

        // 2. Strict Role Verification
        const isTeacherOnly = user.roles.includes("teacher") && !user.roles.includes("admin");
        if (isTeacherOnly) {
            // Guard clause: unlinked staff accounts hit a dead end safely
            if (!teacherId) {
                return { data: [], meta: { page: query.page || 1, pageSize: query.pageSize || 10, total: 0 } };
            }
        }

        // 3. Pagination Configuration (with fallbacks to prevent NaN crashes)
        const page = parseInt(query.page || "1", 10);
        const pageSize = parseInt(query.pageSize || "10", 10);
        const offset = (page - 1) * pageSize;

        const { q, classId, sessionId, status } = query;

        // 4. Delegate database heavy lifting to the repository
        const { data, total } = await studentRepo.getStudentsAndCount({
            filters: { q, classId, sessionId, status },
            teacherId,
            isTeacherOnly,
            limit: pageSize,
            offset
        });

        // 5. Package standard response layout
        return {
            data,
            meta: {
                page,
                pageSize,
                total
            }
        };
    }
}

module.exports = StudentService;
