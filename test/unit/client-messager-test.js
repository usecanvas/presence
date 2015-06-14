'use strict';

require('../test-helper');

const Client         = require('../../lib/client');
const ClientMessager = require('../../lib/client-messager');
const MockSocket     = require('../mock-socket');

describe('ClientMessager', () => {
  let client;

  beforeEach(() => {
    const socket = new MockSocket('/space?identity=a');

    return Client.create(socket).then(_client => {
      client = _client;
    });
  });

  describe('#send', () => {
    it('sends a message to a client', () => {
      ClientMessager.send(client, { foo: 'bar' });
      client.socket.inbox.should.eql([JSON.stringify({ foo: 'bar' })]);
    });
  });

  describe('#error', () => {
    it('sends an error to a client', () => {
      ClientMessager.error(client, 'Error!');
      client.socket.inbox.should.eql([JSON.stringify({ error: 'Error!' })]);
    });
  });
});
