'use strict';

require('./test-helper');

const MockClient      = require('./mock-client');
const dispatchMessage = require('../lib/dispatch-message');
const uuid            = require('node-uuid').v4;
const redisClient     = require('../lib/create-redis-client')();

describe('join', () => {
  let client;

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
      JSON.stringify({ action: 'join', space: space, identity: identity }));

    client.once('message', () => {
      redisClient.get(`spaces.${space}.${identity}`, (err, value) => {
        value.should.eq(identity);
        done();
      });
    });
  });

  it('returns the list of present users', done => {
    const identity1 = 'user1@example.com';
    const identity2 = 'user2@example.com';
    const space     = uuid();

    dispatchMessage(client,
      JSON.stringify({ action: 'join', space: space, identity: identity1 }));

    client.once('join', message => {
      message.members.should.eql([identity1]);

      dispatchMessage(client,
        JSON.stringify({ action: 'join', space: space, identity: identity2 }));

      client.once('join', message => {
        message.members.sort().should.eql([identity1, identity2]);
        done();
      });
    });
  });

  it('sets a TTL on the user presence', done => {
    const identity = 'user@example.com';
    const space    = uuid();

    process.env.PRESENCE_TTL      = 10;
    process.env.PRESENCE_TTL_UNIT = 'PX';

    dispatchMessage(client,
      JSON.stringify({ action: 'join', space: space, identity: identity }));

    client.once('join', message => {
      message.members.should.eql([identity]);

      setTimeout(() => {
        redisClient.keys('*', (err, keys) => {
          if (err) {
            throw err;
          }

          keys.should.eql([]);
          done();
        });
      }, process.env.PRESENCE_TTL * 2);
    });
  });
});
