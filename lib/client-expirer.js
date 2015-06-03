'use strict';

const errors       = require('./error-handlers');
const logfmt       = require('logfmt');
const redisClient  = require('./create-redis-client')();
const sendMessage  = require('./send-message');
const pubsub       = require('./pubsub');
const publisher    = require('./create-redis-client')();
const PRESENCE_TTL = parseInt(process.env.PRESENCE_TTL, 10) || 60000;
const clients      = [];

/**
 * Responsible for checking for and expiring expired clients.
 * @module clientExpirer
 */

startClientExpirationChecker();

module.exports = {
  addClientToPool: addClientToPool,
  clearClientPool: clearClientPool,
};

/**
 * Add a client to the client pool
 *
 * @private
 * @param {ws.WebSocket} client The client to add to the pool
 */
function addClientToPool(client) {
  clients.push(client);
  client.on('close', () => removeClientFromPool(client));
}

/**
 * Completely clear the client pool.
 *
 * This is only for tests, where the pool must be cleared after each test.
 *
 * @private
 */
 function clearClientPool() {
   clients.splice(0, clients.length);
 }

/**
 * Remove a client from the client pool
 *
 * @private
 * @param {ws.WebSocket} client The client to remove from the pool
 */
function removeClientFromPool(client) {
  const index = clients.indexOf(client);

  if (index === -1) {
    logfmt.log({ event: 'warning', message: 'Client not found in pool.' });
  } else {
    clients.splice(index, 1);
  }
}

/**
 * On an interval, check for expired clients and expire them.
 *
 * @private
 */
function startClientExpirationChecker() {
  setInterval(expireExpiredClients, PRESENCE_TTL).unref();
}

/**
 * Call the expirer on each client, expiring them if need be.
 *
 * @private
 */
function expireExpiredClients() {
  clients.forEach(expireExpiredClient);
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
function expireExpiredClient(client) {
  const now = new Date();

  if (!client.__meta) {
    return;
  }

  if (now - client.__meta.joinedAt >= PRESENCE_TTL) {
    redisClient.del(client.__meta.presenceKey, err => {
      if (err) {
        errors.handleRedisError(client, err);
        return;
      }

      pubsub.removeClient(client, client.__meta.space);
      publisher.publish(`spaces.${client.__meta.space}.expire`, client.__meta.identity);
      delete client.__meta;
      sendMessage(client, { action: 'expired' });
    });
  }
}
