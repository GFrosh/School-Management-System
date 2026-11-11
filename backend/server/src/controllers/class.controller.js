const ApiResponse = require("../utils/Response");
const service = require("../services/class.service");

const getClasses = async (req, res) => {
    const data = await service.get();
    return ApiResponse.success(res, data, null, 200);
}

const createClass = async (req, res) => {
    const payload = req.body;
    if (!payload.name || !payload.level) {
        throw ApiResponse.error(400, "BAD_REQUEST", "Invalid payload received");
    }

    const data = service.new(payload);
    return ApiResponse.success(res, data, null, 201);
}

module.exports = { getClasses, createClass };
