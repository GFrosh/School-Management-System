const jwt = require('jsonwebtoken');
const { jwt: jsonwt } = require("../config/index");
const ApiResponse = require("../utils/Response");

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    throw ApiResponse.error(401, "UNAUTHENTICATED", "Missing or Invalid Token");
  }

  jwt.verify(token, jsonwt.accessSecret, (err, decodedPayload) => {
    if (err) {
      throw ApiResponse.error(401, "UNAUTHENTICATED", "Invalid or Expired Token");
    }

    req.user = decodedPayload;
    next();
  });
};


const authenticateRefreshToken = (req, res, next) => {
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) throw ApiResponse.error(401, "UNAUTHENTICATED", "Missing or Invalid Token");

  jwt.verify(refreshToken, jsonwt.refreshSecret, (err, payload) => {
    if (err) throw ApiResponse.error(401, "UNAUTHENTICATED", "Invalid or Expired Token");

    req.user = { ...payload, token: refreshToken };
    next();
  });
}


module.exports = { authenticateToken, authenticateRefreshToken };
