'use strict';

require('./test-helper');

const MockClient      = require('./mock-client');
const dispatchMessage = require('../lib/dispatch-message');
const uuid            = require('node-uuid').v4;

describe('remote join', () => {
  let client;

  beforeEach(() => {
    client = new MockClient();
  });

  it('notifies when a remote user has joined', done => {
    const client2   = new MockClient();
    const identity  = 'user@example.com';
    const identity2 = 'user2@example.com';
    const space     = uuid();

    dispatchMessage(client,
      JSON.stringify({ action: 'join', space: space, identity: identity }));

    client.once('join', () => {
      dispatchMessage(client2,
        JSON.stringify({ action: 'join', space: space, identity: identity2 }));

      client.once('remote join', message => {
        message.should.eql({ action: 'remote join', space: space, identity: identity2 });
        done();
      });
    });
  });
});
