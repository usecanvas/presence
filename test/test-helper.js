'use strict';

require('chai').should();

process.env.PRESENCE_TTL = 100;
process.env.REDIS_URL    = process.env.REDIS_URL || 'redis://localhost:6379';

const clientExpirer  = require('../lib/client-expirer');
const redisClient    = require('../lib/create-redis-client')();
const pubsub         = require('../lib/pubsub');

require('../lib/client-expirer');

afterEach(done => {
  clientExpirer.clearClientPool();
  pubsub.flushSpaces();
  redisClient.flushdb(done);
});
