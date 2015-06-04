'use strict';

const Redis = require('../lib/redis');

module.exports = configureRedis;

/**
 * An initializer that will configure Redis's keyspace notifications
 *
 * @return {Promise} A promise resolved after configuration
 */
function configureRedis() {
  return Redis.configAsync('get', 'notify-keyspace-events').then(config => {
    if (config[1].indexOf('gxK') > -1) {
      return;
    }

    config = `${config[1]}gxK`;
    return Redis.configAsync('set', 'notify-keyspace-events', config);
  });
}
