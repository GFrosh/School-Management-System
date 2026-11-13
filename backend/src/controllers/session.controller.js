const config = require("../config/index");
const ApiResponse = require('../utils/Response');
const service = require("../services/session.service");


const getSession = async (req, res) => {
    const { current } = req.query;
    const isCurrent = current && (String(current) !== "false");
    const sessions = await service.getAll(isCurrent);
    return ApiResponse.success(res, sessions, null, 200);
}


const getTermsBySessionId = async (req, res) => {
    const { id } = req.params;
    if (!id) throw ApiResponse.error(400, "BAD_REQUEST", "Invalid or Missing ID");

    const terms = await service.getTerms(id);
    return ApiResponse.success(res, terms, null, 200);
}


const createSession = async (req, res) => {
    const data = await service.newSess(req.body);
    return ApiResponse.success(res, data, null, 201);
}


const updateSession = async (req, res) => {
    const { id } = req.params;
    const payload = req.body;
    
    if (!id || !payload) {
        throw ApiResponse.error(400, "BAD_REQUEST", "Invalid or Missing ID/payload");
    }

    const data = await service.updateSess(id, payload);
    if (!data) {
        throw ApiResponse.error(404, "NOT_FOUND", "Session not found");
    }
    return ApiResponse.success(res, data, null, 200);
}


const createTerm = async (req, res) => {
    const { id } = req.params;
    const payload = req.body;
    
    if (!id || !payload) {
        throw ApiResponse.error(400, "BAD_REQUEST", "Invalid or Missing ID/payload");
    }


    const data = await service.createTerm(id, payload);
    return ApiResponse.success(res, data, null, 201);
}


module.exports = { getSession, getTermsBySessionId, createSession, updateSession, createTerm };
