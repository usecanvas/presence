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
  client.on('message', onMessage);
}

function onMessage(message) {
  this.send(message);
}
