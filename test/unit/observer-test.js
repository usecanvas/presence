'use strict';

require('../test-helper');

const KEY_SPLITTER   = require('../../lib/client').KEY_SPLITTER;
const Client         = require('../../lib/client');
const ClientMessager = require('../../lib/client-messager');
const ClientRegister = require('../../lib/client-register');
const MockSocket     = require('../mock-socket');
const Redis          = require('../../lib/redis');
const Sinon          = require('sinon');

describe('Observer', () => {
  let Observer, client, subscriber;

  beforeEach(() => {
    subscriber = Redis.createClient();
    Sinon.stub(Redis, 'createClient', () => subscriber);

    delete require.cache[require.resolve('../../lib/observer')];
    Observer = require('../../lib/observer');

    const clientSocket = new MockSocket('/space?identity=a');
    return Client.create(clientSocket).then(_client => {
      client = _client;
    });
  });

  afterEach(() => {
    Redis.createClient.restore();
    subscriber.end();
  });

  describe('#start', () => {
    it('adds a handler for "pmessage"', () => {
      const onSpy = Sinon.spy(subscriber, 'on');
      Observer.start();
      onSpy.should.have.been.calledWith('pmessage');
    });

    it('subscribes to keyspace event notifications', () => {
      const subSpy = Sinon.spy(subscriber, 'psubscribeAsync');
      Observer.start();
      subSpy.should.have.been.calledWith(`__keyspace@*__:longhouse\
${KEY_SPLITTER}spaces${KEY_SPLITTER}*`);
    });
  });

  describe('event handlers', () => {
    let channel, deregisterSpy, sendSpy, subject;

    beforeEach(() => {
      const subjectSocket = new MockSocket('/space?identity=b');
      sendSpy = Sinon.spy(ClientMessager, 'send');
      Observer.start();

      Sinon.stub(ClientRegister, 'clientsInSpace', () => [client]);
      Sinon.stub(ClientRegister, 'getClient', () => subject);
      deregisterSpy = Sinon.spy(ClientRegister, 'deregisterClient');

      return Client.create(subjectSocket).then(_subject => {
        subject = _subject;
        channel = `__keyspace@0__:${Client.getPresenceKey(subject)}`;
      });
    });

    afterEach(() => {
      ClientRegister.clientsInSpace.restore();
      ClientRegister.getClient.restore();
      ClientRegister.deregisterClient.restore();
      ClientMessager.send.restore();
    });

    describe('on a "set" event', () => {
      it('publishes "remote join"', () => {
        const message = 'set';

        subscriber.emit('pmessage', '', channel, message);
        sendSpy.should.have.been.calledWith(client, {
          event: 'remote join',
          client: Client.serialize(subject)
        });
      });
    });

    describe('on a "expired" event', () => {
      let closeSpy;

      beforeEach(() => {
        const message = 'expired';
        closeSpy = Sinon.spy(subject.socket, 'close');
        subscriber.emit('pmessage', '', channel, message);
      });

      it('publishes "remote leave"', () => {
        sendSpy.should.have.been.calledWith(client, {
          event: 'remote leave',
          client: Client.serialize(subject)
        });
      });

      it('sends expired to the subject', () => {
        sendSpy.should.have.been.calledWith(subject, { event: 'expired' });
      });

      it('closes the expired client\'s socket', () => {
        closeSpy.should.have.been.called;
      });

      it('deregisters the client', () => {
        deregisterSpy.should.have.been.calledWith(subject);
      });
    });

    describe('on a "del" event', () => {
      it('publishes "remote leave"', () => {
        const message = 'del';

        subscriber.emit('pmessage', '', channel, message);
        sendSpy.should.have.been.calledWith(client, {
          event: 'remote leave',
          client: Client.serialize(subject)
        });
      });
    });
  });
});
