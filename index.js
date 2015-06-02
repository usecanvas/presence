'use strict';

const configureRedis  = require('./lib/configure-redis');
const http            = require('http');
const koa             = require('koa');
const logfmt          = require('logfmt');
const dispatchMessage = require('./lib/dispatch-message');
const teamster        = require('teamster');
const ws              = require('ws');
const app             = koa();

configureRedis(createTeamster);

function createTeamster() {
  teamster.run(runServer, {
    fork      : process.env.NODE_ENV === 'production',
    numWorkers: parseInt(process.env.NUM_WORKERS, 10) || 1,
  });
}

function runServer() {
  const port = parseInt(process.env.PORT, 10) || 5000;
  http.createServer(app.callback()).listen(port, () => {
    logfmt.log({ event: `Listening on port ${port}.` });
    runWSServer(this);
  });
}

function runWSServer(httpServer) {
  const wsServer = new ws.Server({ server: httpServer });
  wsServer.on('connection', onConnection);
}

function onConnection(client) {
  logfmt.log({ event: 'client connected' });
  client.on('message', message => dispatchMessage(client, message));
}
