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
  let socket;

  beforeEach(() => {
    socket = new MockSocket('/space?identity=test');
  });

  describe('#clientsInSpace', () => {
    it('fetches the local clients in a given space', () => {
      const socketA = socket;
      const socketB = new MockSocket('/space?identity=test2');
      const socketC = new MockSocket('/space2?identity=test3');

      return Bluebird
        .all([socketA, socketB, socketC].map(ClientRegister.registerClient))
        .then(() => {
          return ClientRegister.clientsInSpace('space')
            .map(client => client.socket)
            .should.eql([socketA, socketB]);
        });
    });
  });

  describe('#deregisterClient', () => {
    it('deletes the client presence key', () => {
      return ClientRegister.registerClient(socket).then(client => {
        return ClientRegister.deregisterClient(client);
      }).then(client => {
        return Redis.getAsync(Client.getPresenceKey(client));
      }).then(identity => {
        should.equal(identity, null);
      });
    });

    it('removes the client from the pool', () => {
      return ClientRegister.registerClient(socket).then(client => {
        return ClientRegister.deregisterClient(client);
      }).then(client => {
        should.equal(ClientRegister.getClient(client.id), undefined);
      });
    });
  });

  describe('#getClient', () => {
    it('gets the local client by client ID', () => {
      return ClientRegister.registerClient(socket).then(client => {
        ClientRegister.getClient(client.id).should.eql(client);
      });
    });
  });

  describe('#registerClient', () => {
    it('persists the client to Redis', () => {
      return ClientRegister.registerClient(socket).then(client => {
        return Redis.getAsync(Client.getPresenceKey(client));
      }).then(value => {
        value.should.eql('test');
      });
    });

    it('sets a TTL on the presence', () => {
      let client;

      return ClientRegister.registerClient(socket).then(_client => {
        client = _client;
        return Bluebird.delay(TTL);
      }).then(() => {
        return Redis.getAsync(Client.getPresenceKey(client));
      }).then(value => {
        should.equal(value, null);
      });
    });

    it('adds the client to the client pool', () => {
      return ClientRegister.registerClient(socket).then(client => {
        ClientRegister.getClient(client.id).should.eql(client);
      });
    });

    it('sends the client the current members list', () => {
      return ClientRegister.registerClient(socket).then(client => {
        client.socket.inbox.should.eql([JSON.stringify({
          id     : client.id,
          clients: [Client.serialize(client)]
        })]);
      });
    });
  });

  describe('#removeAllClients', () => {
    it('removes all clients from the local register', () => {
      return ClientRegister.registerClient(socket).then(client => {
        ClientRegister.removeAllClients();
        const foundClient = ClientRegister.getClient(client.id);
        should.equal(foundClient, undefined);
      });
    });
  });

  describe('#renewClient', () => {
    it('updates the client expiration', () => {
      let client;

      return ClientRegister.registerClient(socket).then(_client => {
        client = _client;
        return Bluebird.delay(TTL * 0.6);
      }).then(() => {
        return ClientRegister.renewClient(client);
      }).then(() => {
        return Bluebird.delay(TTL * 0.5);
      }).then(() => {
        return Redis.getAsync(Client.getPresenceKey(client));
      }).then(identity => {
        identity.should.eql('test');
      });
    });
  });
});
