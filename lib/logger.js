'use strict';

const Logfmt = require('logfmt');
const merge  = require('lodash').merge;

/**
 * Logs messages to the console in the Logfmt style
 *
 * @module Logger
 */

module.exports = {
  clientLog: clientLog,
  error: error,
  log: log,
};

/**
 * Log a message along with client metadata.
 *
 * @static
 * @example <caption>Logging a message with client metadata</caption>
 * Logger.clientLog(client, { hello: 'world' });
 * @param {Client} client The client whose metadata should be logged
 * @param {object} message The message to be logged
 */
 function clientLog(client, message) {
   const clientMeta = { client_id: client.id, request_id: client.requestID };
   message = merge(clientMeta, message);
   log(message);
 }

/**
 * Log an error to the console in the Logfmt style.
 *
 * @static
 * @example <caption>Logging an error</caption>
 * Logger.error(new Error('Failure'));
 * @param {Error} err The error to be logged
 */
function error(err) {
  Logfmt.error(err);
}

/**
 * Log a message to the console in the Logfmt style.
 *
 * @static
 * @example <caption>Logging a message</caption>
 * Logger.log({ hello: 'world' });
 * @param {object} message The message to be logged
 */
function log(message) {
  const now = new Date().toISOString();
  Logfmt.log(merge({ time: now }, message));
}

