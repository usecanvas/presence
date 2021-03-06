'use strict';

const Logger = require('./logger');

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
 * @static
 * @example <caption>Messaging a client</caption>
 * ClientMessager.send(client, { hello: 'world' });
 * @param {Client} client The client to send the message to
 * @param {object} message The message to send, JSON-serialized, to the client
 */
function send(client, message) {
  if (process.env.PRETTIFY_JSON_MESSAGES === 'true') {
    message = JSON.stringify(message, null, 2);
  } else {
    message = JSON.stringify(message);
  }

  client.socket.send(message, function onError(err) {
    if (err) {
      Logger.error(err);
      client.socket.close();
      require('./client-register').deregisterClient(client);
    }
  });
}

/**
 * Send an error message to a Client.
 *
 * @static
 * @example <caption>Messaging a client an error</caption>
 * ClientMessager.error(client, 'Error!');
 * @param {Client} client The client to send the error to
 * @param {Error} err The error to send to the client
 */
function error(client, err) {
  send(client, { error: err });
}
