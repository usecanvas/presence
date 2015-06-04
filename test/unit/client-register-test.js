'use strict';

require('../test-helper');

const Bluebird       = require('bluebird');
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

  describe('#registerClient', () => {
    it('persists the client to Redis', () => {
      return ClientRegister.registerClient('clientID', socket).then(client => {
        return Redis.getAsync('longhouse.spaces.space.clientID.test');
      }).then(value => {
        value.should.eql('test');
      });
    });

    it('sets a TTL on the presence', () => {
      return ClientRegister.registerClient('clientID', socket).then(client => {
        return Bluebird.delay(TTL);
      }).then(() => {
        return Redis.getAsync('longhouse.spaces.space.clientID.test');
      }).then(value => {
        should.equal(value, null);
      });
    });

    it('adds the client to the client pool', () => {
      return ClientRegister.registerClient('clientID', socket).then(client => {
        ClientRegister.getClient(client.id).should.eql(client);
      });
    });

    it('sends the client the current members list', () => {
      return ClientRegister.registerClient('clientID', socket).then(client => {
        client.socket.inbox.should.eql([JSON.stringify({
          members: [client.identity]
        })]);
      });
    });
  });

  describe('#renewClient', () => {
    it('updates the client expiration', () => {
      let client;

      return ClientRegister.registerClient('clientID', socket).then(_client => {
        client = _client;
        return Bluebird.delay(TTL * 0.75);
      }).then(() => {
        return ClientRegister.renewClient(client);
      }).then(() => {
        return Bluebird.delay(TTL * 0.5);
      }).then(() => {
        return Redis.getAsync('longhouse.spaces.space.clientID.test');
      }).then(identity => {
        identity.should.eql('test');
      });
    });
  });

  describe('#deregisterClient', () => {
    it('deletes the client presence key', () => {
      return ClientRegister.registerClient('clientID', socket).then(client => {
        return ClientRegister.deregisterClient(client);
      }).then(client => {
        return Redis.getAsync('longhouse.spaces.space.clientID.test');
      }).then(identity => {
        should.equal(identity, null);
      });
    });

    it('removes the client from the pool', () => {
      return ClientRegister.registerClient('clientID', socket).then(client => {
        return ClientRegister.deregisterClient(client);
      }).then(client => {
        should.equal(ClientRegister.getClient(client.id), undefined);
      });
    });
  });
});
