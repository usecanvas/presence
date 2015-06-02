'use strict';

/**
 * A module for sending messages to clients
 * @module sendMessage
 */

module.exports = sendMessage;

/**
 * Send a message to a client.
 *
 * @param {ws.Client} client The client to send the message to
 * @param {Object} message A JSON-serializable message to send to the client
 */
function sendMessage(client, message) {
  message = JSON.stringify(message);
  client.send(message);
}
