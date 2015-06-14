'use strict';

require('../test-helper');

const Client     = require('../../lib/client');
const MockSocket = require('../mock-socket');

describe('Client', () => {
  let socket;

  beforeEach(() => {
    socket = new MockSocket('/space?identity=test');
  });

  describe('#create', () => {
    it('creates a new client', () => {
      return Client.create(socket).then(client => {
        client.id.should.be.a('string');
        client.requestID.should.eql(socket.upgradeReq.headers['x-request-id']);
        client.identity.should.eql('test');
        client.spaceID.should.eql('space');
        client.socket.should.eql(socket);
        client.joinedAt.should.be.a('string');
      });
    });

    context('when given an ID query parameter', () => {
      it('uses the query param as the client ID', () => {
        socket = new MockSocket('/space?identity=test&id=123');

        return Client.create(socket).then(client => {
          client.id.should.eql('123');
        });
      });
    });

    context('when not given a space ID', () => {
      it('rejects with an error', () => {
        socket = new MockSocket('/?identity=test');

        return Client.create(socket).then(() => {
          throw new Error('Expected client creation to throw.');
        }).catch(err => {
          err.message.should.eql('Space ID is required');
        });
      });
    });

    context('when not given an identity parameter', () => {
      it('rejects with an error', () => {
        socket = new MockSocket('/space');

        return Client.create(socket).then(() => {
          throw new Error('Expected client creation to throw.');
        }).catch(err => {
          err.message.should.eql('No identity parameter was supplied');
        });
      });
    });
  });

  describe('#getPresenceKey', () => {
    it('fetches a presence key for the given client', () => {
      return Client.create(socket).then(client => {
        const expected = `longhouse/spaces/${client.spaceID}/${client.id}/\
${client.identity}/${client.joinedAt}`;
        Client.getPresenceKey(client).should.eql(expected);
      });
    });
  });

  describe('#parsePresenceKey', () => {
    it('parses a presence key into client information', () => {
      return Client.create(socket).then(client => {
        const key = Client.getPresenceKey(client);

        Client.parsePresenceKey(key).should.eql({
          id      : client.id,
          identity: client.identity,
          joinedAt: client.joinedAt,
          spaceID : client.spaceID,
        });
      });
    });
  });

  describe('#serialize', () => {
    it('serializes a client ID, identity, and joinedAt', () => {
      return Client.create(socket).then(client => {
        Client.serialize(client).should.eql({
          id      : client.id,
          identity: client.identity,
          joinedAt: client.joinedAt,
        });
      });
    });
  });
});
