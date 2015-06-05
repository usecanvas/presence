'use strict';

const Bluebird = require('bluebird');
const RedisLib = Bluebird.promisifyAll(require('redis'));
const URL      = require('url');

/**
 * Makes requests to a Redis instance
 *
 * This module is itself a Redis client, with an added `createClient` method for
 * creating further Redis clients. The clients have been promisified, so to use
 * the promise version, append `Async` to method names.
 *
 *     Redis.getAsync('myKey').then(value => console.log(value));
 *
 * @module Redis
 */
module.exports = createClient();

/**
 * Create a Redis client.
 *
 * @static
 * @example <caption>Creating another Redis client</caption>
 * Redis.createClient().then(subscriber => subscriber.subscribeAsync('channel'));
 * @return {RedisLib.Client}
 */
function createClient() {
  const redisURL = URL.parse(process.env.REDIS_URL);
  const password = redisURL.auth ? redisURL.auth.split(':')[1] : null;
  const client   = RedisLib.createClient(redisURL.port, redisURL.hostname,
    { auth_pass: password });

  client.createClient = createClient;
  return client;
}
