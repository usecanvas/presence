'use strict';

const createRedisClient = require('./create-redis-client');
const errors            = require('./error-handlers');
const isUUID            = require('validator').isUUID;
const logfmt            = require('logfmt');
const sendMessage       = require('./send-message');
const redisCmd          = createRedisClient();

const PRESENCE_TTL = 60; // seconds
const PRESENCE_VAL = 1;  // arbitrary, we only use the keys

module.exports = dispatchMessage;

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

function handleMessage(action, client, message) {
  const timer = logfmt.time();

  action(client, message, () => {
    timer.log({ event: 'message processed', action: action.name });
  });
}

function join(client, message, cb) {
  const presenceKey  = getPresenceKey(message.space, message.identity);
  const nsKeyPattern = getNSKeyPattern(message.space);

  redisCmd.multi()
    .set(presenceKey, PRESENCE_VAL, 'EX', PRESENCE_TTL)
    .keys(nsKeyPattern)
    .exec((err, replies) => {
      if (err) {
        errors.handleRedisError(client, err);
        return;
      }

      const presenceKeys = replies[1];
      const members      = presenceKeys.map(extractIdentityFromPresenceKey);
      sendMessage(client, { action: 'join', members: members });
      cb();
    });
}

function ping(client, message, cb) {
  const presenceKey = getPresenceKey(message.space, message.identity);

  redisCmd.set(presenceKey, PRESENCE_VAL, 'EX', PRESENCE_TTL, err => {
    if (err) {
      errors.handleRedisError(client, err);
      return;
    }

    sendMessage(client, { action: 'ping' });
    cb();
  });
}

function leave(client, message, cb) {
  const presenceKey = getPresenceKey(message.space, message.identity);
  redisCmd.del(presenceKey, err => {
    if (err) {
      errors.handleRedisError(client, err);
      return;
    }

    sendMessage(client, { action: 'leave' });
    cb();
  });
}

function extractIdentityFromPresenceKey(presenceKey) {
  return presenceKey.split('.').slice(2).join('.');
}

function getNSKeyPattern(space) {
  return `spaces.${space}.*`;
}

function getPresenceKey(space, identity) {
  return `spaces.${space}.${identity}`;
}
