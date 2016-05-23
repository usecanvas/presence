'use strict';

const Logger = require('./logger');
const Sentry = require('./sentry');

/**
 * Sends messages to Clients.
 *
 * @module ClientMessager
 */

module.exports = { error, send, socketSend };

/**
 * Send a message to a Socket.
 *
 * @static
 * @example <caption>Messaging a socket</caption>
 * ClientMessager.socketSend(socket, { hello: 'world' });
 * @param {WS.WebSocket} socket The socket to send the message to
 * @param {object} message The message to send, JSON-serialized, to the client
 */
function socketSend(socket, message) {
  if (process.env.PRETTIFY_JSON_MESSAGES === 'true') {
    message = JSON.stringify(message, null, 2);
  } else {
    message = JSON.stringify(message);
  }

  socket.send(message, err => {
    if (!err) return;

    Logger.error(err);
    Sentry.captureRequestException(socket.upgradeReq, err,
                                   { level: 'info', user: socket.client });
    socket.close();

    if (socket.client) {
      require('./client-register').deregisterClient(socket.client);
    }
  });
}

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
  socketSend(client.socket, message);
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
