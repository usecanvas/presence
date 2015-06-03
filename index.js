'use strict';

const http            = require('http');
const koa             = require('koa');
const logfmt          = require('logfmt');
const dispatchMessage = require('./lib/dispatch-message');
const teamster        = require('teamster');
const ws              = require('ws');
const app             = koa();

/**
 * The server for Longhouse.
 * @module server
 */

createTeamster();

/**
 * Create the Teamster configuration, which is 1 or more web processes.
 *
 * @private
 */
function createTeamster() {
  teamster.run(runServer, {
    fork      : process.env.NODE_ENV === 'production',
    numWorkers: parseInt(process.env.NUM_WORKERS, 10) || 1,
  });
}

/**
 * Run an individual instance of the Longhouse HTTP server.
 *
 * @private
 */
function runServer() {
  const port = parseInt(process.env.PORT, 10) || 5000;
  http.createServer(app.callback()).listen(port, () => {
    logfmt.log({ event: `Listening on port ${port}.` });
    runWSServer(this);
  });
}

/**
 * Run an individual instance of the Longhouse WebSocketserver.
 *
 * @private
 * @param {HTTPServer} httpServer The HTTP server to bind this WS server to
 */
function runWSServer(httpServer) {
  const wsServer = new ws.Server({ server: httpServer });
  wsServer.on('connection', onConnection);
}

/**
 * Handle a client connecting to the WebSocket server.
 *
 * @private
 * @param {ws.WebSocket} client The connected client
 */
function onConnection(client) {
  logfmt.log({ event: 'client connected' });
  client.on('message', message => dispatchMessage(client, message));
}
