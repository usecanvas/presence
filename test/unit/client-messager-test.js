'use strict';

require('../test-helper');

const MockClient     = require('../mock-client');
const ClientMessager = require('../../lib/client-messager');

describe('ClientMessager', () => {
  let client;

  beforeEach(() => {
    client = new MockClient();
  });

  it('sends a message to a client', () => {
    ClientMessager.send(client, { foo: 'bar' });
    client.socket.inbox.should.eql([JSON.stringify({ foo: 'bar' })]);
  });

  it('sends an error to a client', () => {
    ClientMessager.error(client, 'Error!');
    client.socket.inbox.should.eql([JSON.stringify({ error: 'Error!' })]);
  });
});
