const ApiResponse = require("../utils/Response");
const service = require("../services/student.service");

const getStudents = async (req, res) => {
    const query = req.query;
    const user = req.user;
    
    const { data, meta } = await service.get(query, user);
    return ApiResponse.success(res, data, meta, 200);
}

module.exports = { getStudents };
