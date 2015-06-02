'use strict';

require('./test-helper');

const MockClient      = require('./mock-client');
const dispatchMessage = require('../lib/dispatch-message');
const uuid            = require('node-uuid').v4;
const redisClient     = require('../lib/create-redis-client')();

describe('ping', () => {
  let client, originalTTLUnit, originalTTL;

  beforeEach(() => {
    client = new MockClient();
  });

  afterEach(() => {
    delete process.env.PRESENCE_TTL;
    delete process.env.PRESENCE_TTL_UNIT;
  });

  it('sets the user as present', done => {
    const identity = 'user@example.com';
    const space    = uuid();

    dispatchMessage(client,
      JSON.stringify({ action: 'ping', space: space, identity: identity }));

    client.once('message', message => {
      redisClient.get(`spaces.${space}.${identity}`, (err, value) => {
        value.should.eq(identity);
        done();
      });
    });
  });

  it('sends a ping message back', done => {
    const identity1 = 'user1@example.com';
    const identity2 = 'user2@example.com';
    const space     = uuid();

    dispatchMessage(client,
      JSON.stringify({ action: 'ping', space: space, identity: identity1 }));

    client.once('message', message => {
      message.should.eql({ action: 'ping' });
      done();
    });
  });

  it('bumps the TTL on the user presence', done => {
    const identity = 'user@example.com';
    const space    = uuid();

    process.env.PRESENCE_TTL      = 100;
    process.env.PRESENCE_TTL_UNIT = 'PX';

    dispatchMessage(client,
      JSON.stringify({ action: 'join', space: space, identity: identity }));

    client.once('message', message => {
      setTimeout(() => {
        dispatchMessage(client,
          JSON.stringify({ action: 'ping', space: space, identity: identity }));

        setTimeout(() => {
          redisClient.get(`spaces.${space}.${identity}`, (err, value) => {
            value.should.eql(identity);
            done();
          });
        }, process.env.PRESENCE_TTL * 0.75);
      }, process.env.PRESENCE_TTL / 2);
    });
  });
});
