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
    },

    getById: async (studentId, user) => {
        let teacherId = null;

        // 1. Resolve Teacher Profile ID dynamically via User ID
        if (user.roles.includes("teacher")) {
            const teacherRecord = await teacherRepo.getByUserId(user.sub);
            teacherId = teacherRecord?.id || null;
        }

        // 2. Strict Role Verification
        const isTeacherOnly = user.roles.includes("teacher") && !user.roles.includes("admin");

        if (isTeacherOnly && !teacherId) {
            return {
                data: null,
                meta: {
                    page: 1,
                    pageSize: 1,
                    total: 0
                }
            };
        }

        // 3. Delegate database heavy lifting to the repository
        const student = await studentRepo.getStudentById(studentId, teacherId, isTeacherOnly);
        return {
            data: student,
            meta: {
                page: 1,
                pageSize: 1,
                total: student ? 1 : 0
            }
        };
    },


    getEnrolments: async (studentId, user) => {
        let teacherId = null;

        // 1. Resolve Teacher Profile ID dynamically via User ID
        if (user.roles.includes("teacher")) {
            const teacherRecord = await teacherRepo.getByUserId(user.sub);
            teacherId = teacherRecord?.id || null;
        }

        // 2. Strict Role Verification
        const isTeacherOnly = user.roles.includes("teacher") && !user.roles.includes("admin");

        if (isTeacherOnly && !teacherId) {
            return {
                data: [],
                meta: {
                    page: 1,
                    pageSize: 25,
                    total: 0
                }
            };
        }

        // 3. Delegate database heavy lifting to the repository
        const enrolments = await studentRepo.getEnrolments(studentId, teacherId, isTeacherOnly);
        return {
            data: enrolments,
            meta: {
                page: 1,
                pageSize: enrolments.length,
                total: enrolments.length
            }
        };
    }
}

module.exports = StudentService;
