'use strict';

class MockLogger {
  log(object) {
    this.logged = object;
  }

  error(err) {
    this.errored = err;
  }
}

module.exports = new MockLogger();
