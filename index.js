'use strict';

const koa      = require('koa');
const ws       = require('ws');
const teamster = require('teamster');
const app      = koa();

teamster.runServer(app.callback(), {
  fork      : process.env.NODE_ENV === 'production',
  numWorkers: parseInt(process.env.NUM_WORKERS, 10) || 1,
  port      : parseInt(process.env.PORT, 10) || 5000,
});
