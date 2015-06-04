'use strict';

class MockSocket {
  constructor() {
    this.inbox = [];
  }

  send(message) {
    this.inbox.push(message);
  }

  close() {
  }
}

module.exports = MockSocket;
