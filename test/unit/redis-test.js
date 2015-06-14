'use strict';

const Redis       = require('../../lib/redis');
const RedisClient = require('redis').RedisClient;

describe('Redis', () => {
  describe('#createClient', () => {
    it('creates a Redis client', () => {
      const client = Redis.createClient();
      client.should.be.an.instanceOf(RedisClient);
    });
  });
});
