'use strict';

require('../test-helper');

const Client     = require('../../lib/client');
const MockSocket = require('../mock-socket');

describe('Client', () => {
  let joinMessage, socket;

  beforeEach(() => {
    joinMessage = { space_id: 's001', identity: 'i001' };
    socket = new MockSocket('/');
  });

  describe('#create', () => {
    it('creates a new client', () => {
      return Client.create(joinMessage, socket).then(client => {
        client.id.should.be.a('string');
        client.requestID.should.eql(socket.upgradeReq.headers['x-request-id']);
        client.identity.should.eql('i001');
        client.space_id.should.eql('s001');
        client.socket.should.eql(socket);
        client.joined_at.should.be.a('string');
      });
    });

    context('when given an ID query parameter', () => {
      it('uses the query param as the client ID', () => {
        socket = new MockSocket('/');
        joinMessage.client_id = '123';

        return Client.create(joinMessage, socket).then(client => {
          client.id.should.eql('123');
        });
      });
    });

    context('when not given a space ID', () => {
      it('rejects with an error', () => {
        socket = new MockSocket('/');
        delete joinMessage.space_id;

        return Client.create(joinMessage, socket).then(() => {
          throw new Error('Expected client creation to throw.');
        }).catch(err => {
          err.message.should.eql('Space ID is required');
        });
      });
    });

    context('when not given an identity parameter', () => {
      it('rejects with an error', () => {
        socket = new MockSocket('/');
        delete joinMessage.identity;

        return Client.create(joinMessage, socket).then(() => {
          throw new Error('Expected client creation to throw.');
        }).catch(err => {
          err.message.should.eql('No identity parameter was supplied');
        });
      });
    });
  });

  describe('#getPresenceKey', () => {
    it('fetches a presence key for the given client', () => {
      return Client.create(joinMessage, socket).then(client => {
        const expected = `longhouse|spaces|${client.space_id}|${client.id}`;
        Client.getPresenceKey(client).should.eql(expected);
      });
    });
  });

  describe('#parsePresenceKey', () => {
    it('parses a presence key into client information', () => {
      return Client.create(joinMessage, socket).then(client => {
        const key = Client.getPresenceKey(client);

        Client.parsePresenceKey(key).should.eql({
          id: client.id,
          space_id: client.space_id
        });
      });
    });
  });
});
