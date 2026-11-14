const logger = (req, res, next) => {
  const startedAt = process.hrtime.bigint();
  const requestId = req.id || req.headers['x-request-id'] || '-';

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    console.info(JSON.stringify({
      requestId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
    }));
  });

  res.on('close', () => {
    if (!res.writableFinished) {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      console.warn(JSON.stringify({
        requestId,
        method: req.method,
        path: req.originalUrl,
        status: 'aborted',
        durationMs: Math.round(durationMs * 100) / 100,
      }));
    }
  });

  next();
};

module.exports = logger;
