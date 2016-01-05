'use strict';

const Bluebird = require('bluebird');
const UUID     = require('node-uuid');
const parseURL = require('url-parse');
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
  KEY_SPLITTER: KEY_SPLITTER,
  create: create,
  getPresenceKey: getPresenceKey,
  parsePresenceKey: parsePresenceKey,
  serialize: serialize,
};

/**
 * A representation of someone connected to a space over a WebSocket connection
 *
 * @typedef {object} Client
 * @property {string} id The UUID identifying this client
 * @property {string?} requestID The ID of the request this client connected with
 * @property {string} identity The identity value of this client (e.g. an email)
 * @property {string} spaceID The ID of the space this client is connected to
 * @property {WS.WebSocket} socket The socket the client is connected over
 * @property {string} joinedAt The time at which the client joined
 */

/**
 * A key containing information about a connected client
 *
 * The client information is all in the key, split by forward slashes:
 *
 *     longhouse/spaces/${spaceID}/${id}/${identity}/${joinedAt}
 *
 * @typedef {string} PresenceKey
 */

/**
 * Create a new Client.
 *
 * @static
 * @example <caption>Creating a new Client</caption>
 * Client.create(webSocket).then(client => console.log(client));
 * @param {WS.WebSocket} socket The socket that the new client is connected on
 * @return {Promise.<Client>} A promise resolving with a new Client
 */
function create(socket) {
  const parsedURL = parseURL(socket.upgradeReq.url, true);
  const spaceID   = parsedURL.pathname.slice(1);
  const identity  = parsedURL.query.identity;
  const requestID = socket.upgradeReq.headers['x-request-id'];
  const clientID  = parsedURL.query.id || UUID.v4();
  const username  = parsedURL.query.username;

  return new Bluebird((resolve, reject) => {
    if (!spaceID) {
      reject(new Error('Space ID is required'));
    }

    if (!identity) {
      reject(new Error('No identity parameter was supplied'));
    }

    resolve(Object.freeze({
      id: clientID,
      username: username,
      requestID: requestID,
      identity: identity,
      spaceID: spaceID,
      socket: socket,
      joinedAt: new Date().toISOString(),
    }));
  });
}

/**
 * Get the Redis presence key for a client.
 *
 * @static
 * @example <caption>Getting a Redis presence key for a client</caption>
 * Client.getPresenceKey(client);
 * // 'longhouse/spaces/spaceID/clientId/clientIdentity/2015-06-05T20:51:47.411Z'
 * @param {Client} client The client to fetch the presence key for
 * @return {string} A presence key for a client
 */
function getPresenceKey(client) {
  return [
    'longhouse',
    'spaces',
    client.spaceID,
    client.id,
    client.identity,
    client.joinedAt,
    client.username
  ].join(KEY_SPLITTER);
}

/**
 * Parse a presence key for Client info
 *
 * @static
 * @example <caption>Parsing a presence key</caption>
 * Client.parsePresenceKey('longhouse/spaces/spaceID/clientId/clientIdentity/2015-06-05T20:51:47.411Z');
 * // { id: 'clientID', identity: 'clientIdentity', spaceID: 'spaceID', joinedAt: '2015-06-05T20:51:47.411Z' }
 * @param {string} presenceKey A presence key
 * @return {Client} A client
 */
function parsePresenceKey(presenceKey) {
  const parts = presenceKey.split(KEY_SPLITTER);

  return {
    id: parts[3],
    identity: parts[4],
    spaceID: parts[2],
    joinedAt: parts[5],
    username: parts[6],
  };
}

/**
 * Serialize a client for sending to another client.
 *
 * @static
 * @example <caption>Serializing a client</caption>
 * Client.serialize(client);
 * // { id: 'clientID', identity: 'clientIdentity', joinedAt: '2015-06-05T20:51:47.411Z' }
 * @param {Client} client The client to serialize
 */
function serialize(client) {
  return pick(client, 'id', 'identity', 'joinedAt', 'username');
}
