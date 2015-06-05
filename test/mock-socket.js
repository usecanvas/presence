'use strict';

const UUID = require('node-uuid');

class MockSocket {
  constructor(pathQuery) {
    this.inbox      = [];
    this.upgradeReq = {
      url: `http://example.com${pathQuery}`,
      headers: { 'x-request-id': UUID.v4() },
    };
  }

  send(message) {
    this.inbox.push(message);
  }

  close() {
  }
}

module.exports = MockSocket;
