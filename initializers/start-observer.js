'use strict';

const Observer = require('../lib/observer');

module.exports = startObserver;

/**
 * An initializer that will start the Observer module
 *
 * @return {Promise} A promise resolved when the observer is started
 */
function startObserver() {
  return Observer.start();
}
