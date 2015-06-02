'use strict';

const http     = require('http');
const koa      = require('koa');
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

  sendMessage(this, message);
}

function handleUnparsableMessage(client, message) {
  sendMessage(client,
    { errors: [{ detail: 'Client passed non-JSON message.' }]});
}

function sendMessage(client, message) {
  message = JSON.stringify(message);
  client.send(message);
}
