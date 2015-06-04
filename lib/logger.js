'use strict';

const Logfmt = require('logfmt');
const merge  = require('lodash').merge;

/**
 * Logs messages to the console in the Logfmt style
 *
 * @module Logger
 */

module.exports = {
  log: log,
  error: error,
};

/**
 * Log a message to the console in the Logfmt style.
 *
 * @param {object} message The message to be logged
 */
function log(message) {
  const now = new Date().toISOString();
  Logfmt.log(merge({ time: now }, message));
}

/**
 * Log an error to the console in the Logfmt style.
 *
 * @param {Error} err The error to be logged
 */
function error(err) {
  Logfmt.error(err);
}
