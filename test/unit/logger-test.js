'use strict';

require('../test-helper');

const Logger  = require('../../lib/logger');
const Logfmt  = require('logfmt');
const Sinon   = require('sinon');

describe('Logger', () => {
  let logSpy, errSpy;

  beforeEach(() => {
    logSpy = Sinon.stub(Logfmt, 'log');
    errSpy = Sinon.stub(Logfmt, 'error');
  });

  afterEach(() => {
    Logfmt.log.restore();
    Logfmt.error.restore();
  });

  describe('#clientLog', () => {
    it('logs along with client information', () => {
      Logger.clientLog({
        id : 'clientID',
        requestID: 'requestID',
      }, { foo: 'bar' });

      const arg = logSpy.firstCall.args[0];
      arg.client_id.should.eql('clientID');
      arg.request_id.should.eql('requestID');
      arg.foo.should.eql('bar');
    });
  });

  describe('#error', () => {
    it('logs the error', () => {
      const err = new Error('Error.');
      Logger.error(err);
      errSpy.should.have.been.calledWith(err);
    });
  });

  describe('#log', () => {
    it('logs the given object', () => {
      Logger.log({ foo: 'bar' });
      const arg = logSpy.firstCall.args[0];
      arg.foo.should.eql('bar');
    });
  });
});
