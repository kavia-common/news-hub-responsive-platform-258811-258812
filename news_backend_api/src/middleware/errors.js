'use strict';

const { HttpError } = require('../utils/httpError.js');

/**
 * PUBLIC_INTERFACE
 * 404 handler for unknown routes.
 */
function notFoundHandler(req, res, _next) {
  res.status(404).json({
    error: 'Not Found',
    code: 'NotFound',
    path: req.originalUrl,
  });
}

/**
 * PUBLIC_INTERFACE
 * Central error handler.
 */
function errorHandler(err, req, res, _next) {
  const status = typeof err?.status === 'number' ? err.status : 500;
  const code = err?.code || (status >= 500 ? 'InternalError' : 'RequestError');

  // Avoid leaking sensitive details in prod; still provide useful debug info in dev.
  const isDev = (process.env.NODE_ENV || 'development') !== 'production';

  const payload = {
    error: err?.message || 'Internal Server Error',
    code,
    path: req.originalUrl,
  };

  if (isDev) {
    payload.details = err instanceof HttpError ? err.details : err?.details;
    payload.stack = err?.stack;
  }

  // eslint-disable-next-line no-console
  console.error('[news_backend_api] error', {
    status,
    code,
    message: err?.message,
    path: req.originalUrl,
  });

  res.status(status).json(payload);
}

module.exports = { notFoundHandler, errorHandler };
