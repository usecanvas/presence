'use strict';

const Redis = require('../lib/redis');

module.exports = configureRedis;

/**
 * An initializer that will configure Redis's keyspace notifications
 *
 * @static
 * @return {Promise<string>} A promise resolved after configuration
 */
function configureRedis() {
  return Redis.configAsync('get', 'notify-keyspace-events').then(config => {
    if (config[1].indexOf('$ghxK') > -1) return Promise.resolve();

    config = `${config[1]}$ghxK`;
    return Redis.configAsync('set', 'notify-keyspace-events', config);
  });
}
