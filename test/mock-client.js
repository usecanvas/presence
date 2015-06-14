'use strict';

const MockSocket = require('./mock-socket');
const UUID       = require('node-uuid');

class MockClient {
  constructor() {
    this.id = UUID.v4();
    this.spaceID = UUID.v4();
    this.requestID = UUID.v4();
    this.socket = new MockSocket();
  }
}

module.exports = MockClient;
