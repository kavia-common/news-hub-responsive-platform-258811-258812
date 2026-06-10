'use strict';

const { HttpError } = require('../utils/httpError.js');

/**
 * PUBLIC_INTERFACE
 * Validate req.body against a Zod schema.
 * Attaches parsed data back onto req.body.
 * @param {import('zod').ZodSchema<any>} schema
 */
function validateBody(schema) {
  return (req, _res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return next(
        new HttpError(400, 'ValidationError', 'Invalid request body', {
          issues: parsed.error.issues,
        })
      );
    }
    req.body = parsed.data;
    return next();
  };
}

module.exports = { validateBody };
