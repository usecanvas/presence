'use strict';

const redis = require('redis');
const url   = require('url');

/**
 * A module for creating Redis clients, which we do a lot.
 * @module createRedisClient
 */

module.exports = createRedisClient;

/**
 * Create a Redis client from `$REDIS_URL`.
 *
 * Will throw if this variable is not present or can not be parsed.
 * @return {redis.Client}
 */
function createRedisClient() {
  const redisURL = url.parse(process.env.REDIS_URL);
  const password = redisURL.auth ? redisURL.auth.split(':')[1] : null;
  return redis.createClient(redisURL.port, redisURL.hostname,
    { auth_pass: password });
}
