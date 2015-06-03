'use strict';

const createRedisClient = require('./create-redis-client');
const errors            = require('./error-handlers');
const isUUID            = require('validator').isUUID;
const logfmt            = require('logfmt');
const sendMessage       = require('./send-message');
const pubsub            = require('./pubsub');
const redisCmd          = createRedisClient();
const publisher         = createRedisClient();

module.exports = dispatchMessage;

/**
 * Responsible for handling events sent to Longhouse by WebSocket clients.
 * @module dispatchMessage
 */

/**
 * Dispatch a message from the given client to a handler.
 *
 * This function parses the given client message and passes it along to the
 * appropriate handler. If a handler for the message is not found, an error will
 * be sent to the client.
 *
 * This function also validates that the space provided in the message is a v4
 * UUID and that the "identity" parameter is set.
 *
 * When the message has been handled, an acknowledgement message (with,
 * potentially, some metadata) will be sent back to the client.
 *
 * @param {ws.WebSocket} client The client to dispatch a message from
 * @param {String} message The raw message from the client
 */
function dispatchMessage(client, message) {
  try {
    message = JSON.parse(message);
  } catch(err) {
    errors.handleUnparsableMessage(client, message);
    return;
  }

  if (!isUUID(message.space, '4')) {
    errors.handleNonUUIDSpace(client, message);
    return;
  }

  if (!message.identity) {
    errors.handleNoIdentityProvided(client, message);
    return;
  }

  if (message.action === 'join' && client.__meta) {
    errors.handleAlreadyJoined(client, message);
    return;
  }

  switch (message.action) {
    case 'join':
      handleMessage(join, client, message);
      break;
    case 'ping':
      handleMessage(ping, client, message);
      break;
    case 'leave':
      handleMessage(leave, client, message);
      break;
    default:
      errors.handleUnrecognizedAction(client, message);
  }
}

/**
 * Handle a message from a client, and log the time it takes to complete.
 *
 * @private
 * @param {String} action The action to be handled
 * @param {ws.WebSocket} client The client that called this action
 * @param {Object} message The parsed message from the client
 */
function handleMessage(action, client, message) {
  const timer = logfmt.time();

  action(client, message, () => {
    timer.log({ event: 'message processed', action: action.name });
  });
}

/**
 * Handle a request for a client to join a space.
 *
 * This sets a key like `spaces.${spaceUUID}.${userIdentity}` in Redis with an
 * expiration.
 *
 * @private
 * @param {ws.WebSocket} client The client that called this action
 * @param {Object} message The parsed message from the client
 * @param {Function} cb A callback to call after the request is fulfilled
 */
function join(client, message, cb) {
  const presenceKey  = getPresenceKey(message.space, message.identity);
  const nsKeyPattern = getNSKeyPattern(message.space);
  const meta         = {};

  client.__meta = meta;
  pubsub.joinClient(message.space, client, message.identity);

  meta.joinedAt           = new Date();
  meta.expirationInterval = getExpirationInterval(client);
  meta.space              = message.space;
  meta.identity           = message.identity;

  redisCmd.multi()
    .set(presenceKey, message.identity)
    .keys(nsKeyPattern)
    .exec((err, replies) => {
      if (err) {
        errors.handleRedisError(client, err);
        return;
      }

      publisher.publish(`spaces.${message.space}.join`, message.identity);

      const presenceKeys = replies[1];
      const members      = presenceKeys.map(extractIdentityFromPresenceKey);
      sendMessage(client, { action: 'join', members: members });
      cb();
    });
}

/**
 * Handle a request for a client to establish that they are still present.
 *
 * This sets a key like `spaces.${spaceUUID}.${userIdentity}` in Redis with an
 * expiration.
 *
 * @private
 * @param {ws.WebSocket} client The client that called this action
 * @param {Object} message The parsed message from the client
 * @param {Function} cb A callback to call after the request is fulfilled
 */
function ping(client, message, cb) {
  client.__meta.joinedAt = new Date();

  process.nextTick(() => {
    sendMessage(client, { action: 'ping' });
    cb();
  });
}

/**
 * Handle a request for a client to leave a space.
 *
 * This deletes a key like `spaces.${spaceUUID}.${userIdentity}` in Redis.
 *
 * @private
 * @param {ws.WebSocket} client The client that called this action
 * @param {Object} message The parsed message from the client
 * @param {Function} cb A callback to call after the request is fulfilled
 */
function leave(client, message, cb) {
  const presenceKey = getPresenceKey(message.space, message.identity);

  pubsub.removeClient(client, message.space);

  redisCmd.del(presenceKey, err => {
    if (err) {
      errors.handleRedisError(client, err);
      return;
    }

    publisher.publish(`spaces.${message.space}.leave`, message.identity);
    sendMessage(client, { action: 'leave' });
    cb();
  });
}

/**
 * Check whether a client's presence has expired, expire them if so.
 *
 * If presence has expired, we delete their presence key from Redis and publish
 * an expire event to their most recently joined channel.
 *
 * @private
 * @param {ws.WebSocket} client The client being inspected for expiration
 */
function checkClientExpiration(client) {
  const now         = new Date();
  const presenceKey = getPresenceKey(client.__meta.space, client.__meta.identity);

  if (now - client.__meta.joinedAt >= getPresenceTTL()) {
    redisCmd.del(presenceKey, err => {
      if (err) {
        errors.handleRedisError(client, err);
        return;
      }

      clearInterval(client.__meta.expirationInterval);

      publisher.publish(`spaces.${client.__meta.space}.expire`, client.__meta.identity);
      sendMessage(client, { action: 'expired' });
    });
  }
}

function extractIdentityFromPresenceKey(presenceKey) {
  return presenceKey.split('.').slice(2).join('.');
}

function getExpirationInterval(client) {
  return setInterval(() => {
    checkClientExpiration(client);
  }, process.env.PRESENCE_TTL);
}

function getNSKeyPattern(space) {
  return `spaces.${space}.*`;
}

function getPresenceKey(space, identity) {
  return `spaces.${space}.${identity}`;
}

function getPresenceTTL() {
  return parseInt(process.env.PRESENCE_TTL, 10) || 60000;
}
