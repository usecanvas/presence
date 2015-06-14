'use strict';

const ClientMessager = require('./client-messager');
const Client         = require('./client');
const Redis          = require('./redis');
const objectValues   = require('lodash').values;
const KEY_SPLITTER   = Client.KEY_SPLITTER;

/**
 * A register of all contected Clients
 *
 * @module ClientRegister
 */

module.exports = {
  clientsInSpace  : clientsInSpace,
  deregisterClient: deregisterClient,
  getClient       : getClient,
  registerClient  : registerClient,
  removeAllClients: removeAllClients,
  renewClient     : renewClient,
};

/**
 * @private
 * @member {object} clients An object containing all clients currently connected
 */
const clients = {};

/**
 * Return the list of Clients in a space *in the current process*.
 *
 * @static
 * @example <caption>Listing the clients in a space</caption>
 * ClientRegister.clientsInSpace(spaceID);
 * // [{ id: 'clientID' }] etc...
 * @param {string} spaceID The space ID to get clients for
 * @return {Client[]} The clients in the given space
 */
function clientsInSpace(spaceID) {
  return objectValues(clients).filter(client => client.spaceID === spaceID);
}

/**
 * Deregister a client, and remove their persisted presence.
 *
 * @static
 * @example <caption>Deregistering a client</caption>
 * ClientRegister.deregisterClient(client).then(client => console.log(client));
 * @param {Client} client The client to deregister
 * @return {Promise.<Client>} A promise resolving with the client after
 *   deregistration
 */
function deregisterClient(client) {
  const presenceKey = Client.getPresenceKey(client);
  delete clients[client.id];
  return Redis.delAsync(presenceKey).return(client);
}

/**
 * Get a client by ID *from the current process's client pool*.
 *
 * @static
 * @example <caption>Getting a client</caption>
 * Client.getClient('clientID');
 * @param {string} clientID The ID of the client to fetch
 * @return {Client}
 */
function getClient(clientID) {
  return clients[clientID];
}

/**
 * Register a new client with a given client ID, and send them a list of the
 * currently joined members in their space.
 *
 * @static
 * @example <caption>Registering a client</caption>
 * ClientRegister.registerClient(webSocket).then(client => console.log(client));
 * @param {WS.WebSocket} socket The socket that the new client is connected on
 * @return {Promise.<Client>} A promise resolved with the newly-registered
 *   Client
 */
function registerClient(socket) {
  let client;

  return Client.create(socket).then(_client => {
    client = _client;
    return persistClientPresence(client);
  }).then(() => {
    return setClientExpiration(client);
  }).then(() => {
    const nsKeyPattern = getNSKeyPattern(client.spaceID);
    return Redis.keysAsync(nsKeyPattern);
  }).then(presenceKeys => {
    clients[client.id] = client;
    const members = presenceKeys.map(Client.parsePresenceKey)
      .map(Client.serialize);

    return ClientMessager.send(client, { id: client.id, clients: members });
  }).then(() => client);
}

/**
 * Renew a client's presence.
 *
 * @static
 * @example <caption>Renewing a client's presence lease</caption>
 * ClientRegister.renewClient(client).then(client => console.log(client));
 * @param {Client} client The client to renew presence for
 * @return {Promise.<Client>} A promise resolving with the client after presence
 *   renewed
 */
function renewClient(client) {
  return setClientExpiration(client).return(client);
}

/**
 * Forcibly remove all clients from the registry (but do not remove them from
 * Redis).
 *
 * @static
 */
function removeAllClients() {
  for (let key in clients) {
    delete clients[key];
  }
}

/**
 * Get the presence key pattern for a space.
 *
 * @private
 * @param {string} spaceID The ID of the space to get presence key pattern for
 * @return {string} A pattern to fetch presence keys for a space
 */
function getNSKeyPattern(spaceID) {
  return `longhouse${KEY_SPLITTER}spaces${KEY_SPLITTER}${spaceID}${KEY_SPLITTER}*`;
}

/**
 * Persist a client's presence to Redis.
 *
 * @private
 * @param {Client} client The client to persist presence for
 * @return {Promise.<Client>} A promise resolving with the client after
 *   persistence
 */
function persistClientPresence(client) {
  const presenceKey = Client.getPresenceKey(client);
  return Redis.setAsync(presenceKey, client.identity).return(client);
}

/**
 * Set a client's expiration time in Redis.
 *
 * @private
 * @param {Client} client The client to set expiration for
 * @return {Promise.<Client>} A promise resolving when the expiration is set
 */
function setClientExpiration(client) {
  const presenceKey = Client.getPresenceKey(client);
  return Redis.pexpireAsync(presenceKey,
    parseInt(process.env.PRESENCE_TTL, 10) || 60000).return(client);
}
