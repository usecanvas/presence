'use strict';

class MockSocket {
  constructor(pathQuery) {
    this.inbox      = [];
    this.upgradeReq = { url: `http://example.com${pathQuery}`, };
  }

  send(message) {
    this.inbox.push(message);
  }

  close() {
  }
}

module.exports = MockSocket;
