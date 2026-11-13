const ApiResponse = require("../utils/Response");

const requireRoles = (roles) => (req, res, next) => {
    try {
        if (roles === "*") return next();
        const required = Array.isArray(roles) ? roles : [roles];
        const userRoles = req.user?.roles || [];
        const isAllowed = required.some(role => userRoles.includes(role));
        if (!isAllowed) {
            throw ApiResponse.error(403, "FORBIDDEN", "User does not have access to this operation");
        }
        return next();
    } catch (error) {
        return next(error);
    }
}

module.exports = requireRoles;
