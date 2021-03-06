'use strict';

process.env.PRESENCE_TTL = 20;
process.env.REDIS_URL    = 'redis://localhost:6379';

const chai = require('chai');
chai.should();
chai.use(require('sinon-chai'));

const ClientRegister = require('../lib/client-register');
// const Initializers   = require('../initializers');
const Redis          = require('../lib/redis');

beforeEach(() => {
  // return Initializers.start();
});

afterEach(() => {
  ClientRegister.removeAllClients();
  return Redis.flushdbAsync();
});
