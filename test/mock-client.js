'use strict';

const EventEmitter = require('events').EventEmitter;

class MockClient extends EventEmitter {
  constructor() {
    super();
    this.inbox = [];
  }

  send(message) {
    message = JSON.parse(message);
    this.emit(message.action, message);
    this.emit('message', message);
  }
}

module.exports = MockClient;
