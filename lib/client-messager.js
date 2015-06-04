'use strict';

/**
 * Sends messages to Clients.
 *
 * @module ClientMessager
 */

module.exports = {
  send: send,
  error: error,
};

/**
 * Send a message to a Client.
 *
 * @param {Client} client The client to send the message to
 * @param {object} message The message to send, JSON-serialized, to the client
 */
function send(client, message) {
  if (process.env.PRETTIFY_JSON_MESSAGES === 'true') {
    message = JSON.stringify(message, null, 2);
  } else {
    message = JSON.stringify(message);
  }

  client.socket.send(message);
}

/**
 * Send an error message to a Client.
 *
 * @param {Client} client The client to send the error to
 * @param {Error} err The error to send to the client
 */
function error(client, err) {
  send(client, { error: err });
}
