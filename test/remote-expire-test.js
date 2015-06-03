'use strict';

require('./test-helper');

const MockClient      = require('./mock-client');
const dispatchMessage = require('../lib/dispatch-message');
const uuid            = require('node-uuid').v4;

describe('remote expire', () => {
  let client;

  beforeEach(() => {
    client = new MockClient();
  });

  afterEach(() => {
    delete process.env.PRESENCE_TTL;
  });

  it('notifies when a remote user has expired', done => {
    const client2   = new MockClient();
    const identity  = 'user@example.com';
    const identity2 = 'user2@example.com';
    const space     = uuid();

    process.env.PRESENCE_TTL = 100;

    dispatchMessage(client,
      JSON.stringify({ action: 'join', space: space, identity: identity }));

    client.once('join', () => {
      setTimeout(() => {
        dispatchMessage(client2,
          JSON.stringify({ action: 'join', space: space, identity: identity2 }));

        client2.on('remote expire', message => {
          message.should.eql({ action: 'remote expire', space: space, identity: identity });
          done();
        });
      }, process.env.PRESENCE_TTL * 0.75);
    });
  });
});
