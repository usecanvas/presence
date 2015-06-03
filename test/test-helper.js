'use strict';

require('chai').should();

process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const redisClient    = require('../lib/create-redis-client')();
const pubsub         = require('../lib/pubsub');

afterEach(done => {
  pubsub.flushSpaces();
  redisClient.flushdb(done);
});
