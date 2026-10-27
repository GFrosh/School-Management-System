const AppError = require('../utils/AppError');

module.exports = (req, res, next) => {
  next(new AppError(404, 'NOT_FOUND', `Route not found: ${req.originalUrl}`, { method: req.method, url: req.originalUrl }));
};