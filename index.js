'use strict';

const http     = require('http');
const isUUID   = require('validator').isUUID;
const koa      = require('koa');
const logfmt   = require('logfmt');
const teamster = require('teamster');
const ws       = require('ws');
const app      = koa();

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
  try {
    message = JSON.parse(message);
  } catch(err) {
    handleUnparsableMessage(this, message);
    return;
  }

  if (!isUUID(message.space, '4')) {
    handleNonUUIDSpace(this, message);
    return;
  }

  switch (message.action) {
    case 'join':
      logfmt.log({ action: 'join' });
      sendMessage(client, { action: 'join' });
      break;
    case 'ping':
      logfmt.log({ action: 'ping' });
      sendMessage(client, { action: 'ping' });
      break;
    case 'leave':
      logfmt.log({ action: 'leave' });
      sendMessage(client, { action: 'leave' });
      break;
    default:
      handleUnrecognizedAction(this, message);
  }
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
