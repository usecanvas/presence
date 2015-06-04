'use strict';

const Bluebird       = require('bluebird');
const ClientMessager = require('./client-messager');
const Redis          = require('./redis');
const parseURL       = require('url-parse');
const objectValues   = require('lodash').values;

/**
 * A register of all contected Clients
 *
 * @module ClientRegister
 */

module.exports = {
  clientsInSpace  : clientsInSpace,
  deregisterClient: deregisterClient,
  removeAllClients: removeAllClients,
  getClient       : getClient,
  renewClient     : renewClient,
  registerClient  : registerClient,
};

/**
 * A representation of someone connected to a space over a WebSocket connection
 *
 * @typedef Client
 * @property {string} id The UUID identifying this client
 * @property {string} identity The identity value of this client (e.g. an email)
 * @property {string} spaceID The ID of the space this client is connected to
 * @property {WS.WebSocket} socket The socket the client is connected over
 */

/**
 * @private
 * @property {object} clients An object containing all clients currently
 *   connected
 */
const clients = {};

/**
 * Return the list of Clients in a space.
 *
 * @param {string} spaceID The space ID to get clients for
 * @return {Client[]} The clients in the given space
 */
function clientsInSpace(spaceID) {
  return objectValues(clients).filter(client => client.spaceID === spaceID);
}

/**
 * Deregister a client, and remove their persisted presence.
 *
 * @param {Client} client The client to deregister
 * @return {Promise} A promise resolving with the client after deregistration
 */
function deregisterClient(client) {
  const presenceKey = getPresenceKey(client);
  delete clients[client.id];
  return Redis.delAsync(presenceKey).return(client);
}

/**
 * Get a client by ID.
 *
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
 * @param {string} clientID The UUID for the new client
 * @param {WS.WebSocket} socket The socket that the new client is connected on
 * @return {Promise} A promise resolved with the newly-registered Client
 */
function registerClient(clientID, socket) {
  if (clients[clientID]) {
    throw new Error(`A client is already connected with that ID: ${clientID}`);
  }

  let client;

  return createClient(clientID, socket).then(_client => {
    client = _client;
    return persistClientPresence(client);
  }).then(() => {
    return setClientExpiration(client);
  }).then(() => {
    const nsKeyPattern = getNSKeyPattern(client.spaceID);
    return Redis.keysAsync(nsKeyPattern);
  }).then(presenceKeys => {
    clients[client.id] = client;
    const identities = presenceKeys.map(extractIdentityFromPresenceKey);
    return ClientMessager.send(client, { members: identities });
  }).then(() => client);
}

/**
 * Renew a client's presence.
 *
 * @param {Client} client The client to renew presence for
 * @return {Promise} A promise resolving with the client after presence renewed
 */
function renewClient(client) {
  return setClientExpiration(client);
}

/**
 * Create a new Client.
 *
 * @param {string} clientID The UUID for the new client
 * @param {WS.WebSocket} socket The socket that the new client is connected on
 * @return {Promise} A promise resolving with a new Client
 */
function createClient(clientID, socket) {
  const parsedURL = parseURL(socket.upgradeReq.url, true);
  const spaceID   = parsedURL.pathname.slice(1);
  const identity  = parsedURL.query.identity;

  return new Bluebird((resolve, reject) => {
    if (!spaceID) {
      reject(new Error('Space ID is required'));
    }

    if (!identity) {
      reject(new Error('No identity parameter was supplied'));
    }

    resolve(Object.freeze({
      id: clientID,
      identity: identity,
      spaceID: spaceID,
      socket: socket,
    }));
  });
}

/**
 * Extract an identity value from a presence key.
 *
 * @private
 * @param {string} presenceKey A presence key
 * @return {string} A client identity
 */
function extractIdentityFromPresenceKey(presenceKey) {
  return presenceKey.split('.').slice(4).join('.');
}

/**
 * Get the presence key pattern for a space.
 *
 * @private
 * @param {string} spaceID The ID of the space to get presence key pattern for
 * @return {string} A pattern to fetch presence keys for a space
 */
function getNSKeyPattern(spaceID) {
  return `longhouse.spaces.${spaceID}.*`;
}

/**
 * Get the Redis presence key for a client.
 *
 * @private
 * @param {Client} client The client to fetch the presence key for
 * @return {string} A presence key for a client
 */
function getPresenceKey(client) {
  return `longhouse.spaces.${client.spaceID}.${client.id}.${client.identity}`;
}

/**
 * Forcibly remove all clients from the registry (but do not remove them from
 * Redis).
 */
function removeAllClients() {
  for (let key in clients) {
    delete clients[key];
  }
}

/**
 * Set a client's expiration time in Redis.
 *
 * @private
 * @param {Client} client The client to set expiration for
 * @return {Promise} A promise resolving when the expiration is set
 */
function setClientExpiration(client) {
  const presenceKey = getPresenceKey(client);
  return Redis.pexpireAsync(presenceKey,
    parseInt(process.env.PRESENCE_TTL, 10) || 60000);
}

/**
 * Persist a client's presence to Redis.
 *
 * @private
 * @param {Client} client The client to persist presence for
 * @return {Promise} A promise resolving with the client after persistence
 */
function persistClientPresence(client) {
  const presenceKey = getPresenceKey(client);
  return Redis.setAsync(presenceKey, client.identity);
}
