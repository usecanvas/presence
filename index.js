'use strict';

const ClientRegister = require('./lib/client-register');
const ClientMessager = require('./lib/client-messager');
const HTTP           = require('http');
const Initializers   = require('./initializers');
const Logger         = require('./lib/logger');
const Sentry         = require('./lib/sentry');
const Teamster       = require('teamster');
const WSServer       = require('ws').Server;
const app            = require('koa')();

app.use(function* catchError(next) {
  try {
    yield next;
  } catch (err) {
    Logger.error(err);
    Sentry.captureRequestException(this.req, err);
    this.body =
      { id: 'unexpected', message: 'An unexpected message occurred.' };
  }
});

app.use(function* showHealth() {
  if (this.url === '/health') {
    this.body = 'ok';
  }
});

/**
 * A collection of private functions, run automatically when the app starts, for
 * creating our Koa app and HTTP and WS servers.
 *
 * @module Main
 */

Initializers.start()
  .then(createTeamster)
  .catch(err => { throw err; });

/**
 * Start 1 or more web processes running our app.
 *
 * @private
 */
function createTeamster() {
  Teamster.run(startServers, {
    fork: process.env.NODE_ENV === 'production',
    numWorkers: parseInt(process.env.NUM_WORKERS, 10) || 1
  });
}

/**
 * Start HTTP and WS servers for our app.
 *
 * @private
 */
function startServers() {
  const port = parseInt(process.env.PORT, 10) || 5000;

  HTTP.createServer(app.callback()).listen(port, function() {
    Logger.log({ event: `HTTP server listening on port ${port}` });
    startWSServer(this);
  });
}

/**
 * Start a WS server for handling WebSocket connections.
 *
 * @private
 * @param {HTTP.Server} httpServer The httpServer to attach the WS server to
 */
function startWSServer(httpServer) {
  const wsServer = new WSServer({ server: httpServer });
  wsServer.on('connection', onConnection);
}

/**
 * Handle a newly connected WebSocket connection
 *
 * @private
 * @param {WS.WebSocket} socket The new WebSocket connection
 */
function onConnection(socket) {
  socket.pingInterval = setInterval(_ => {
    if (socket.readyState === socket.OPEN) {
      socket.send(JSON.stringify({ ping: true }));
    }
  }, 30000);

  socket.on('message', message => onMessage(socket, message));
}

/**
 * Handle a message sent by a client.
 *
 * @private
 * @param {WS.WebSocket} socket The socket over which the message was sent
 * @param {string} message The message sent by the client
 */
function onMessage(socket, message) {
  try {
    message = JSON.parse(message);
  } catch (err) {
    Logger.error(err);
    Sentry.captureRequestException(socket.upgradeReq, err,
                                   { level: 'info', user: socket.client });
    ClientMessager.socketSend(socket, { error: 'Unparsable message sent' });
    return;
  }

  if (message.action === 'join' && !socket.client) {
    ClientRegister.registerClient(message, socket).then(client => {
      socket.client = client;
      Logger.clientLog(client, { event: 'New WebSocket client connected' });
      client.socket.on('close', _ => onClose(client));
    }).catch(err => {
      const requestID = socket.upgradeReq.headers['x-request-id'];
      Sentry.captureRequestException(socket.upgradeReq, err);
      ClientMessager.error({ socket }, 'Error when joining new client');
      Logger.log({ request_id: requestID,
                   event: 'Could not create new client' });
      Logger.error(err);
      socket.close();
    });

    return;
  }

  if (!socket.client) return;

  if (message.action === 'update') {
    message.clientId = socket.client.id;
    return ClientRegister.updateMeta(socket.client, message).then(_ => {
      ClientRegister.renewClient(socket.client);
    });
    return;
  }

  if (message.action !== 'ping') {
    const err = `Unrecognized action sent: ${message.action}`;
    Logger.clientLog(socket.client, { event: err });
    ClientMessager.error(socket.client, err);
    return;
  }

  ClientRegister.renewClient(socket.client);
}

/**
 * Handle a client's socket closing.
 *
 * @private
 * @param {Client} client The client whose socket has closed.
 */
function onClose(client) {
  clearInterval(client.socket.pingInterval);
  Logger.clientLog(client, { event: 'Client closed socket connection' });
  ClientRegister.deregisterClient(client);
}
