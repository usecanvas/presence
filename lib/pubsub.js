'use strict';

const createRedisClient = require('./create-redis-client');
const logfmt            = require('logfmt');
const sendMessage       = require('./send-message');
const spaces            = {};
const subscription      = createRedisClient();

configureSubscription(subscription);

module.exports = {
  flushSpaces : flushSpaces,
  joinClient  : joinClient,
  removeClient: removeClient,
};

function flushSpaces() {
  for (let key in spaces) {
    delete spaces[key];
  }
}

function configureSubscription(subscription) {
  subscription.psubscribe('__keyspace@*__:spaces.*');

  subscription.on('pmessage', (_pattern, channel, message) => {
    const eventName = message;
    const space     = channel.split('.').slice(1, 2).join('');
    const identity  = channel.split('.').slice(2).join('.');

    switch (eventName) {
      case 'expire':  // "SET" with an expiration
        publishEvent('remote join', space, identity);
        break;
      case 'expired': // Actually expired
        publishEvent('remote expire', space, identity);
        break;
      case 'del':
        publishEvent('remote leave', space, identity);
        break;
      default:
        logfmt.log({ event: `Unrecognized event: "${eventName}".` });
    }
  });
}

function joinClient(space, client, identity) {
  client.__identity = identity;
  spaces[space] = spaces[space] || [];

  const isJoined = spaces[space].indexOf(client) > -1;

  if (!isJoined) {
    spaces[space].push(client);
    client.on('close', () => removeClient(client));
  }
}

function removeClient(client, space) {
  const timer = logfmt.time();

  let spaceCount = 0;

  if (space) {
    spaceCount++;
    removeClientFromSpace(client, space);
  } else {
    for (space in spaces) {
      spaceCount++;
      removeClientFromSpace(client, space);
    }
  }

  timer.log({ event: 'removed client', space_count: spaceCount });
}

function removeClientFromSpace(client, space) {
  const clients = spaces[space];
  const index   = clients.indexOf(client);

  if (index !== -1) {
    clients.splice(index, 1);
  }
}

function publishEvent(eventName, space, identity) {
  const clients     = spaces[space] || [];
  const timer       = logfmt.time();

  let clientCount = 0;

  for (let i = 0, len = clients.length; i < len; i++) {
    const client = clients[i];

    if (client.__identity === identity) {
      continue;
    }

    clientCount++;

    sendMessage(client,
      { action: eventName, space: space, identity: identity });
  }

  timer.log({
    event       : 'event published',
    event_name  : eventName,
    client_count: clientCount
  });
}
