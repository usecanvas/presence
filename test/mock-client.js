'use strict';

const EventEmitter = require('events').EventEmitter;

class MockClient extends EventEmitter {
  constructor() {
    super();
    this.inbox = [];
  }

  send(message) {
    this.emit('message', JSON.parse(message));
  }
}

module.exports = MockClient;
