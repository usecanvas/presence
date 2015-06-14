'use strict';

require('../test-helper');

const proxyquire = require('proxyquire').noCallThru();
const MockLogger = require('../mock-logger');
const Logger     = proxyquire('../../lib/logger', { logfmt: MockLogger });

describe('Logger', () => {
  afterEach(() => {
    MockLogger.logged  = null;
    MockLogger.errored = null;
  });

  describe('#clientLog', () => {
    it('logs along with client information', () => {
      Logger.clientLog({
        id : 'clientID',
        requestID: 'requestID',
      }, { foo: 'bar' });

      MockLogger.logged.client_id.should.eql('clientID');
      MockLogger.logged.request_id.should.eql('requestID');
      MockLogger.logged.foo.should.eql('bar');
    });
  });

  describe('#error', () => {
    it('logs the error', () => {
      const err = new Error('Error.');
      Logger.error(err);
      MockLogger.errored.should.eql(err);
    });
  });

  describe('#log', () => {
    it('logs the given object', () => {
      Logger.log({ foo: 'bar' });
      MockLogger.logged.foo.should.eql('bar');
    });
  });
});
