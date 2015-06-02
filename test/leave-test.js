'use strict';

require('./test-helper');

const MockClient      = require('./mock-client');
const dispatchMessage = require('../lib/dispatch-message');
const uuid            = require('node-uuid').v4;
const redisClient     = require('../lib/create-redis-client')();
const should          = require('chai').should();

describe('leave', () => {
  let client, originalTTLUnit, originalTTL;

  beforeEach(() => {
    client = new MockClient();
  });

  afterEach(() => {
    delete process.env.PRESENCE_TTL;
    delete process.env.PRESENCE_TTL_UNIT;
  });

  it('sets the user as not present', done => {
    const identity = 'user@example.com';
    const space    = uuid();

    dispatchMessage(client,
      JSON.stringify({ action: 'join', space: space, identity: identity }));

    client.once('message', message => {
      dispatchMessage(client,
        JSON.stringify({ action: 'leave', space: space, identity: identity }));

      client.once('message', message => {
        redisClient.get(`spaces.${space}.${identity}`, (err, value) => {
          should.equal(value, null);
          done();
        });
      });
    });
  });
});
