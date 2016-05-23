'use strict';

const Bluebird = require('bluebird');
const UUID     = require('node-uuid');
const pick     = require('lodash').pick;

/**
 * Functions for working with Client objects
 *
 * @module Client
 */

 /**
  * @member {string} KEY_SPLITTER The value used to separate client information
  *   in a PresenceKey
  */
const KEY_SPLITTER = '|';

module.exports = {
  KEY_SPLITTER,
  create,
  getPresenceKey,
  parsePresenceKey,
  toRedisHash
};

/**
 * A representation of someone connected to a space over a WebSocket connection
 *
 * @typedef {object} Client
 * @property {string} id The UUID identifying this client
 * @property {string?} requestID The ID of the request this client connected
 *   with
 * @property {string} identity The identity value of this client (e.g. an email)
 * @property {string} spaceID The ID of the space this client is connected to
 * @property {object} meta Meta information associated with this client
 * @property {WS.WebSocket} socket The socket the client is connected over
 * @property {string} joined_at The time at which the client joined
 */

/**
 * A key containing information about a connected client
 *
 * The client information is all in the key, split by forward slashes:
 *
 *     longhouse/spaces/${spaceID}/${id}
 *
 * @typedef {string} PresenceKey
 */

/**
 * Create a new Client.
 *
 * @static
 * @example <caption>Creating a new Client</caption>
 * Client.create(message, webSocket).then(client => console.log(client));
 * @param {Object} joinMessage The message that initiated the registration
 * @param {WS.WebSocket} socket The socket that the new client is connected on
 * @return {Promise.<Client>} A promise resolving with a new Client
 */
function create(joinMessage, socket) {
  const spaceID   = joinMessage.space_id;
  const identity  = joinMessage.identity;
  const requestID = socket.upgradeReq.headers['x-request-id'];
  const clientID  = joinMessage.client_id || UUID.v4();
  const meta      = joinMessage.meta || {};

  return new Bluebird((resolve, reject) => {
    if (!spaceID) {
      reject(new Error('Space ID is required'));
    }

    if (!identity) {
      reject(new Error('No identity parameter was supplied'));
    }

    resolve(Object.freeze({
      id: clientID,
      requestID,
      identity,
      space_id: spaceID,
      meta,
      socket,
      joined_at: new Date().toISOString()
    }));
  });
}

/**
 * Get the Redis presence key for a client.
 *
 * @static
 * @example <caption>Getting a Redis presence key for a client</caption>
 * Client.getPresenceKey(client);
 * // 'longhouse|spaces|spaceID|clientId'
 * @param {Client} client The client to fetch the presence key for
 * @return {string} A presence key for a client
 */
function getPresenceKey(client) {
  return [
    'longhouse',
    'spaces',
    client.space_id,
    client.id
  ].join(KEY_SPLITTER);
}

/**
 * Parse a presence key for Client info
 *
 * @static
 * @example <caption>Parsing a presence key</caption>
 * Client.parsePresenceKey('longhouse|spaces|spaceID|clientId');
 * // { id: 'clientID', space_id: 'spaceID' }
 * @param {string} presenceKey A presence key
 * @return {Client} A client
 */
function parsePresenceKey(presenceKey) {
  const parts = presenceKey.split(KEY_SPLITTER);
  return { id: parts[3], space_id: parts[2] };
}

/**
 * Serialize a client into a Redis Hash
 *
 * @static
 * @example <caption>Serializing a client to a Redis Hash</caption>
 * Client.toRedisHash(client);
 * // [
 * //   "id", "clientID",
 * //   "identity", "clientIdentity",
 * //   "joined_at", "2015-06-05T20:51:47.411Z"
 * // ]
 * @param {Client} client The client to serialize to a Redis Hash
 * @returns {object} The serialized client (an array of alternating keys/values)
 */
function toRedisHash(client) {
  return Object.assign(
    pick(client, 'id', 'identity', 'joined_at', 'space_id'),
    client.meta
  );
}
