'use strict';

process.env.PRESENCE_TTL = 0.5;
process.env.REDIS_URL    = 'redis://localhost:6379';

require('chai').should();

const Initializers = require('../initializers');
const Redis        = require('../lib/redis');

beforeEach(() => {
  return Initializers.start();
});

afterEach(() => {
  return Redis.flushdbAsync();
});
