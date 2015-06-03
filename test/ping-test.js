'use strict';

require('./test-helper');

const MockClient      = require('./mock-client');
const dispatchMessage = require('../lib/dispatch-message');
const uuid            = require('node-uuid').v4;

describe('ping', () => {
  let client;

  beforeEach(() => {
    client = new MockClient();
  });

  it('sends a ping message back', done => {
    const identity = 'user1@example.com';
    const space     = uuid();

    dispatchMessage(client,
      JSON.stringify({ action: 'join', space: space, identity: identity }));

    client.once('join', () => {
      dispatchMessage(client,
        JSON.stringify({ action: 'ping' }));

      client.once('ping', message => {
        message.should.eql({ action: 'ping' });
        done();
      });
    });
  });

  it('bumps the TTL on the user presence', done => {
    const identity = 'user!!@example.com';
    const space    = uuid();

    dispatchMessage(client,
      JSON.stringify({ action: 'join', space: space, identity: identity }));

    client.once('join', () => {
      const joinedAt = client.__meta.joinedAt;

      setTimeout(() => { // So that at least 1ms passes
        dispatchMessage(client,
          JSON.stringify({ action: 'ping' }));

        client.once('ping', () => {
          client.__meta.joinedAt.should.be.gt(joinedAt);
          done();
        });
      }, 1);
    });
  });
});
