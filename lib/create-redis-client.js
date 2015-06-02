'use strict';

const redis = require('redis');
const url   = require('url');

module.exports = createRedisClient;

function createRedisClient() {
  const redisURL = url.parse(process.env.REDIS_URL);
  const password = url.auth ? url.auth.split(':')[1] : null;
  return redis.createClient(redisURL.port, redisURL.hostname,
    { auth_pass: password });
}
