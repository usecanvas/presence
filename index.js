'use strict';

const http     = require('http');
const isUUID   = require('validator').isUUID;
const koa      = require('koa');
const logfmt   = require('logfmt');
const redis    = require('redis');
const teamster = require('teamster');
const url      = require('url');
const ws       = require('ws');
const app      = koa();
const redisCmd = createRedisClient();

teamster.run(runServer, {
  fork      : process.env.NODE_ENV === 'production',
  numWorkers: parseInt(process.env.NUM_WORKERS, 10) || 1,
});

function runServer() {
  const port = parseInt(process.env.PORT, 10) || 5000;
  http.createServer(app.callback()).listen(port, () => runWSServer(this));
}

function runWSServer(httpServer) {
  const wsServer = new ws.Server({ server: httpServer })
  wsServer.on('connection', onConnection);
}

function onConnection(client) {
  client.on('message', dispatchMessage);
}

function dispatchMessage(message) {
  const client = this;

  try {
    message = JSON.parse(message);
  } catch(err) {
    handleUnparsableMessage(client, message);
    return;
  }

  if (!isUUID(message.space, '4')) {
    handleNonUUIDSpace(client, message);
    return;
  }

  if (!message.identity) {
    handleNoIdentityProvided(client, message);
    return;
  }

  switch (message.action) {
    case 'join':
      logfmt.log({ action: 'join' });

      redisCmd.multi()
        .sadd(message.space, message.identity)
        .smembers(message.space)
        .exec((err, replies) => {
          if (err) {
            handleRedisError(client, err);
            return;
          }

          sendMessage(client, { action: 'join', members: replies[1] });
        });

      break;
    case 'ping':
      logfmt.log({ action: 'ping' });
      sendMessage(client, { action: 'ping' });
      redisCmd.sadd(message.space, message.identity);
      break;
    case 'leave':
      logfmt.log({ action: 'leave' });
      sendMessage(client, { action: 'leave' });
      redisCmd.srem(message.space, message.identity);
      break;
    default:
      handleUnrecognizedAction(client, message);
  }
}

function createRedisClient() {
  const redisURL = url.parse(process.env.REDIS_URL);
  const password = url.auth ? url.auth.split(':')[1] : null;
  return redis.createClient(redisURL.port, redisURL.hostname,
    { auth_pass: password });
}

function handleRedisError(client, error) {
  logfmt.error(error);
  sendMessage(client,
    { errors: [{ detail: 'An unexpected error occurred.' }]});
}

function handleNoIdentityProvided(client/*, message */) {
  logfmt.log({ error: 'No identity provided.' });
  sendMessage(client,
    { errors: [{ detail: 'No "identity" param provided.' }]});
}

function handleNonUUIDSpace(client, message) {
  logfmt.log({ error: `Non-UUID space: "${message.space}".` });
  sendMessage(client,
    { errors: [{ detail: 'Space provided is not a UUID.' }]})
}

function handleUnrecognizedAction(client, message) {
  logfmt.log({ error: `Unrecognized action: "${message.action}"` })
  sendMessage(client,
    { errors: [{ detail: 'Client passed unrecognized action in message.' }]});
}

function handleUnparsableMessage(client/*, message */) {
  logfmt.log({ error: 'Unparsable message received' });
  sendMessage(client,
    { errors: [{ detail: 'Client passed non-JSON message.' }]});
}

function sendMessage(client, message) {
  message = JSON.stringify(message);
  client.send(message);
}
