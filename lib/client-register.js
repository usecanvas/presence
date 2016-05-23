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
  clientsInSpace,
  deregisterClient,
  getClient,
  registerClient,
  removeAllClients,
  renewClient,
  updateMeta
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
  return objectValues(clients).filter(client => client.space_id === spaceID);
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
 * @return {?Client} The client with the given ID or null
 */
function getClient(clientID) {
  return clients[clientID];
}

/**
 * Update the metadata for a given client in Redis.
 *
 * @static
 * @param {Client} client The client whose metadata should be updated
 * @param {object} message The message containing the metadata
 * @return {Promise} A promise resolving once the update has been completed
 */
function updateMeta(client, message) {
  const presenceKey = Client.getPresenceKey(client);
  return Redis.hmsetAsync(presenceKey, message.meta);
}

/**
 * Register a new client with a given client ID, and send them a list of the
 * currently joined members in their space.
 *
 * @static
 * @example <caption>Registering a client</caption>
 * ClientRegister.registerClient(webSocket).then(client => console.log(client));
 * @param {Object} joinMessage The message that initiated the registration
 * @param {WS.WebSocket} socket The socket that the new client is connected on
 * @return {Promise.<Client>} A promise resolved with the newly-registered
 *   Client
 */
function registerClient(joinMessage, socket) {
  return Client.create(joinMessage, socket).then(client => {
    return persistClientPresence(client).then(_ => {
      return setClientExpiration(client);
    }).then(_ => {
      const nsKeyPattern = getNSKeyPattern(client.space_id);
      return Redis.keysAsync(nsKeyPattern);
    }).then(presenceKeys => {
      return Redis
        .multi(presenceKeys.map(presenceKey => ['hgetall', presenceKey]))
        .execAsync();
    }).then(members => {
      clients[client.id] = client;
      return ClientMessager.send(client, { id: client.id, clients: members });
    }).return(client);
  });
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
  for (const key in clients) {
    if (!clients.hasOwnProperty(key)) continue;
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
  return `longhouse${KEY_SPLITTER}spaces${KEY_SPLITTER}${spaceID}${KEY_SPLITTER}*`; // eslint-disable-line max-len
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
  return Redis.hmsetAsync(presenceKey, Client.toRedisHash(client));
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
