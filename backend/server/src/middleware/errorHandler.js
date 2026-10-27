const AppError = require('../utils/AppError');

module.exports = (err, req, res, next) => {
  let status = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Something went wrong';
  let details = [];

  if (err instanceof AppError) {
    status = err.status;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err.code === '23505') {
    // PostgreSQL unique constraint violation
    status = 409;
    code = 'CONFLICT';
    message = 'A record with these details already exists';
  } else if (err.type === 'entity.parse.failed') {
    // malformed JSON in the request body
    status = 400;
    code = 'INVALID_JSON';
    message = 'Request body is not valid JSON';
  } else {
    console.error(err);
  }

  res.status(status).json({
    error: { code, message, details, requestId: req.id },
  });
};