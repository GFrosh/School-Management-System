const ApiResponse = require("../utils/Response");
const service = require("../services/student.service");

const getStudents = async (req, res) => {
    const query = req.query;
    const user = req.user;
    
    const { data, meta } = await service.get(query, user);
    return ApiResponse.success(res, data, meta, 200);
}


const getStudentById = async (req, res) => {
    const studentId = req.params.id;
    const user = req.user;

    const { data, meta } = await service.getById(studentId, user);
    return ApiResponse.success(res, data, meta, 200);
};


const getStudentEnrolments = async (req, res) => {
    const studentId = req.params.id;
    const user = req.user;

    const { data, meta } = await service.getEnrolments(studentId, user);
    return ApiResponse.success(res, data, meta, 200);
}

module.exports = { getStudents, getStudentById, getStudentEnrolments };
