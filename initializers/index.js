'use strict';

const Bluebird       = require('bluebird');
const configureRedis = require('./configure-redis');
const startObserver  = require('./start-observer');

/**
 * Initializes the application's dependencies before it starts
 *
 * @module Initializers
 */

module.exports = { start: start };

/**
 * Start the Initializers.
 *
 * @static
 * @return {Promise} A promise resolved when all initializers are started
 */
function start() {
  return Bluebird.all([configureRedis(), startObserver()]);
}
