'use strict';

const MockSocket = require('./mock-socket');

class MockClient {
  constructor() {
    this.socket = new MockSocket();
  }
}

module.exports = MockClient;
