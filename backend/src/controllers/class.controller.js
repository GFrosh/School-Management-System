const ApiResponse = require("../utils/Response");
const service = require("../services/class.service");

const getClasses = async (req, res) => {
    const data = await service.get(req.user);
    return ApiResponse.success(res, data, null, 200);
}

const createClass = async (req, res) => {
    const payload = req.body;
    if (!payload.name || !payload.level) {
        throw ApiResponse.error(400, "BAD_REQUEST", "Invalid payload received");
    }

    const data = await service.new(payload);
    return ApiResponse.success(res, data, null, 201);
}

const updateClass = async (req, res) => {
    const data = await service.update(req.params.id, req.body);
    return ApiResponse.success(res, data, null, 200);
};

module.exports = { getClasses, createClass, updateClass };
