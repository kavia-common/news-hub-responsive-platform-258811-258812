'use strict';

/**
 * PUBLIC_INTERFACE
 * Read environment variable with optional default.
 * @param {string} key
 * @param {string} [defaultValue]
 * @returns {string}
 */
function getEnv(key, defaultValue = '') {
  const v = process.env[key];
  if (v == null || v === '') return defaultValue;
  return String(v);
}

module.exports = { getEnv };
