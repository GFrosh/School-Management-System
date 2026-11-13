module.exports = (err, req, res, next) => {
  let status = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Something went wrong';
  let details = [];

  // FIX: Look for the 'isOperational' property that ApiResponse.error() attaches to its instances
  if (err.isOperational) {
    status = err.status || 400;
    code = err.code || 'BAD_REQUEST';
    message = err.message;
    details = err.details || [];
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
