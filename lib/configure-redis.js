'use strict';

const logfmt      = require('logfmt');
const redisClient = require('./create-redis-client')();

/**
 * Configure Redis according to our needs.
 * @module configureRedis
 */

module.exports = configureRedis;

/**
 * Set the proper configuration for `notify-keyspace-events`.
 *
 * This is necessary so that rather than using a more complicated publishing
 * model, we can simply listen for keys being set, expiring, and deleted in our
 * pubsub module.
 *
 * @param {Function} cb A callback to be called once configuration is complete
 */
function configureRedis(cb) {
  redisClient.config('get', 'notify-keyspace-events', (err, conf) => {
    if (err) {
      throw err;
    }

    if (conf[1].indexOf('gxK') > -1) {
      cb();
    } else {
      const config = `${conf[1]}gxK`;

      redisClient.config('set', 'notify-keyspace-events', config, (err) => {
        if (err) {
          throw err;
        }

        logfmt.log({
          event: `Configured keyspace event notifications: "${config}".`
        });

        cb();
      });
    }
  });
}
