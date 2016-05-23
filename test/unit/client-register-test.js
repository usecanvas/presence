'use strict';

require('../test-helper');

const Bluebird       = require('bluebird');
const Client         = require('../../lib/client');
const ClientRegister = require('../../lib/client-register');
const MockSocket     = require('../mock-socket');
const Redis          = require('../../lib/redis');
const should         = require('chai').should();
const TTL            = parseInt(process.env.PRESENCE_TTL, 10);

describe('ClientRegister', () => {
  let joinMessage, socket;

  beforeEach(() => {
    joinMessage = { space_id: 's001', identity: 'i001' };
    socket = new MockSocket('/space?identity=test&username=user');
  });

  describe('#clientsInSpace', () => {
    it('fetches the local clients in a given space', () => {
      const socketA = socket;
      const socketB = new MockSocket('/');
      const socketC = new MockSocket('/');

      return Bluebird
        .all([socketA, socketB, socketC].map((registeredSocket, i) => {
          let spaceID = 's001';
          if (registeredSocket === socketC) spaceID = 's002';
          joinMessage = { space_id: spaceID, identity: `i00${i}` };
          return ClientRegister.registerClient(joinMessage, registeredSocket);
        })).then(_ => {
          return ClientRegister.clientsInSpace('s001')
            .map(client => client.socket)
            .should.eql([socketA, socketB]);
        });
    });
  });

  describe('#deregisterClient', () => {
    it('deletes the client presence key', () => {
      return ClientRegister.registerClient(joinMessage, socket).then(client => {
        return ClientRegister.deregisterClient(client);
      }).then(client => {
        return Redis.getAsync(Client.getPresenceKey(client));
      }).then(identity => {
        should.equal(identity, null);
      });
    });

    it('removes the client from the pool', () => {
      return ClientRegister.registerClient(joinMessage, socket).then(client => {
        return ClientRegister.deregisterClient(client);
      }).then(client => {
        should.equal(ClientRegister.getClient(client.id), undefined);
      });
    });
  });

  describe('#getClient', () => {
    it('gets the local client by client ID', () => {
      return ClientRegister.registerClient(joinMessage, socket).then(client => {
        ClientRegister.getClient(client.id).should.eql(client);
      });
    });
  });

  describe('#registerClient', () => {
    it('persists the client to Redis', () => {
      return ClientRegister.registerClient(joinMessage, socket).then(client => {
        return Redis.hgetallAsync(Client.getPresenceKey(client)).then(value => {
          value.should.eql(Client.toRedisHash(client));
        });
      });
    });

    it('sets a TTL on the presence', () => {
      let client;

      return ClientRegister.registerClient(joinMessage, socket).then(_client => {
        client = _client;
        return Bluebird.delay(TTL);
      }).then(() => {
        return Redis.getAsync(Client.getPresenceKey(client));
      }).then(value => {
        should.equal(value, null);
      });
    });

    it('adds the client to the client pool', () => {
      return ClientRegister.registerClient(joinMessage, socket).then(client => {
        ClientRegister.getClient(client.id).should.eql(client);
      });
    });

    it('sends the client the current members list', () => {
      return ClientRegister.registerClient(joinMessage, socket).then(client => {
        client.socket.inbox.should.eql([JSON.stringify({
          id: client.id,
          clients: [Client.toRedisHash(client)]
        })]);
      });
    });
  });

  describe('#removeAllClients', () => {
    it('removes all clients from the local register', () => {
      return ClientRegister.registerClient(joinMessage, socket).then(client => {
        ClientRegister.removeAllClients();
        const foundClient = ClientRegister.getClient(client.id);
        should.equal(foundClient, undefined);
      });
    });
  });

  describe('#renewClient', () => {
    it('updates the client expiration', () => {
      let client;

      return ClientRegister.registerClient(joinMessage, socket).then(_client => {
        client = _client;
        return Bluebird.delay(TTL * 0.6);
      }).then(() => {
        return ClientRegister.renewClient(client);
      }).then(() => {
        return Bluebird.delay(TTL * 0.5);
      }).then(() => {
        return Redis.hgetallAsync(Client.getPresenceKey(client));
      }).then(clientValue => {
        clientValue.should.eql(Client.toRedisHash(client));
      });
    });
  });
});
