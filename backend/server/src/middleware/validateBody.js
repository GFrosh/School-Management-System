const AppError = require('../utils/AppError');

module.exports = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      code: issue.code,
      message: issue.message,
    }));
    return next(new AppError(422, 'VALIDATION_FAILED', 'Request body is invalid', details));
  }
  req.body = result.data; // the cleaned, validated version
  next();
};