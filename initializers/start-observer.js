'use strict';

const Observer = require('../lib/observer');

module.exports = startObserver;

/**
 * An initializer that will start the Observer module
 *
 * @static
 * @return {Promise.<string>} A promise resolved when the observer is started
 */
function startObserver() {
  return Observer.start();
}
