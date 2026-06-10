'use strict';

/**
 * PUBLIC_INTERFACE
 * Error class used for HTTP-safe errors with status + code.
 */
class HttpError extends Error {
  /**
   * @param {number} status
   * @param {string} code
   * @param {string} message
   * @param {any} [details]
   */
  constructor(status, code, message, details) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

module.exports = { HttpError };
