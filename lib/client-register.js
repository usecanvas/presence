'use strict';

/**
 * A register of Clients connected to the current WebSocket server
 *
 * @module ClientRegister
 */

 module.exports = { registerClient: registerClient };

 /**
  * A user connected to this process via a WebSocket
  *
  * @typedef Client
  * @property {string} id A v4 UUID representing the client's request ID
  * @property {Set.<string>} spaces The set of spaces this client is connected
  *   to
  * @property {WebSocket} socket The socket holding the client's connection
  */

/**
 * @private
 * @property {Object.<string, Client>} The object containing the connected
 *   clients whose keys are the clients' request IDs
 */
const clients = {};

/**
 * Register a new Client for a given WebSocket connection.
 *
 * If the socket's `upgradeReq` does not have a "x-request-id" header, or the
 * socket already has a client registered, this function will throw.
 *
 * @example <caption>Registering a Client for a web socket</caption>
 * const client = ClientRegister.registerClient(webSocket);
 * @param {WebSocket} socket The socket to register a new client for
 * @return {Client}
 */
function registerClient(socket) {
  const requestID = socket.upgradeReq.headers['x-request-id'];

  if (!requestID) {
    throw new Error('No request ID provided for this socket.');
  }

  if (clients[requestID]) {
    throw new Error('A Client is already registered for this socket.');
  }

  const client = createClient(requestID, socket);
  clients[requestID] = socket;
  return client;
}

/**
 * Create a new client from a given request ID and web socket.
 *
 * @private
 * @param {string} id A v4 UUID representing the client's request ID
 * @param {WebSocket} socket The socket to create a Client for
 * @return {Client}
 */
function createClient(requestID, socket) {
  return Object.freeze({
    id: requestID,
    spaces: new Set(),
    socket: socket,
  });
}
