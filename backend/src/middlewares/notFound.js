const ApiResponse = require('../utils/Response');

module.exports = (req, res, next) => {
  next(ApiResponse.error(404, 'NOT_FOUND', `Route not found: ${req.originalUrl}`, [{ method: req.method, url: req.originalUrl }]));
};