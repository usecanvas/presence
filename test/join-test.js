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

  it('sets the user as present', done => {
    const identity = 'user@example.com';
    const space    = uuid();

    dispatchMessage(client,
      JSON.stringify({ action: 'join', space: space, identity: identity }));

    client.once('message', message => {
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

    client.once('message', message => {
      message.members.should.eql([identity1]);

      dispatchMessage(client,
        JSON.stringify({ action: 'join', space: space, identity: identity2 }));

      client.once('message', message => {
        message.members.sort().should.eql([identity1, identity2]);
        done();
      });
    });
  });
});
