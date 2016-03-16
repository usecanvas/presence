'use strict';

const Raven = require('raven');
const _     = require('lodash');

let client;
if (process.env.SENTRY_DSN) {
  client = new Raven.Client(process.env.SENTRY_DSN);
}

module.exports = {
  captureRequestException: captureRequestException,
  captureException: captureException,
};

function captureRequestException(req, err, opts) {
  if (!client) return;

  let protocol;
  if (req.headers.upgrade === 'websocket') {
    protocol = req.connection.encrypted ? 'wss' : 'ws';
  } else if (req.headers['x-forwarded-proto']) {
    protocol = req.headers['x-forwarded-proto'];
  } else {
    protocol = req.connection.encrypted ? 'https' : 'http';
  }

  const host     = req.headers.host;
  const ip       = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const url      = `${protocol}://${host}${req.url}`;

  opts = _.merge({
    user: { ip_address: ip },
    extra: { request_id: req.headers['x-request-id'], },
    tags: { url: url }
  }, opts);

  captureException(err, opts);
}

function captureException() {
  if (!client) return;
  return client.captureException.apply(client, arguments);
}
