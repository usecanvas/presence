'use strict';

const logfmt      = require('logfmt');
const redisClient = require('./create-redis-client')();

module.exports = configureRedis;

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
