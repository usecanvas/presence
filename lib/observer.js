'use strict';

const ClientMessager = require('./client-messager');
const ClientRegister = require('./client-register');
const Logger         = require('./logger');
const Redis          = require('./redis');
const subscriber     = Redis.createClient();

/**
 * Observes Redis keyspace events and notifies clients of updates
 *
 * @module Observer
 */

module.exports = { start: start };

/**
 * Start the subscription and observance of keyspace events.
 *
 * @return {Promise} A promise resolved when the subscription starts
 */
function start() {
  subscriber.on('pmessage', handleMessage);

  return subscriber.psubscribeAsync(`__keyspace@*__:longhouse.spaces.*`);
}

/**
 * Handle a message received by the event subscriber.
 *
 * @private
 * @param {string} _pattern The pattern the message matches
 * @param {string} channel The channel the message came over
 * @param {string} message The message that was received
 */
function handleMessage(_pattern, channel, message) {
  const eventName = message;
  const clientID  = channel.split('.').slice(3, 4).join('.');
  const spaceID   = channel.split('.').slice(2, 3).join('.');
  const identity  = channel.split('.').slice(4).join('.');

  switch (eventName) {
    case 'set':
      publishEvent('remote join', spaceID, clientID, identity);
      break;
    case 'expired':
      expireClient(ClientRegister.getClient(clientID));
      publishEvent('remote leave', spaceID, clientID, identity);
      break;
    case 'del':
      publishEvent('remote leave', spaceID, clientID, identity);
      break;
    default:
      return;
  }
}

/**
 * Handle an expired client.
 *
 * @private
 * @param {Client} client The expired client
 */
function expireClient(client) {
  if (!client) {
    return;
  }

  ClientMessager.send(client, { event: 'expired' });
  client.socket.close();
  ClientRegister.deregisterClient(client);
}

/**
 * Publish an event to all clients connected to a space.
 *
 * @private
 * @param {string} eventName The name of the event
 * @param {string} spaceID The ID of the space to publish to
 * @param {string} clientID The ID of the subject client
 * @param {string} identity The identity of the subject client
 */
function publishEvent(eventName, spaceID, clientID, identity) {
  const clients = ClientRegister.clientsInSpace(spaceID);

  for (let i = 0, len = clients.length; i < len; i++) {
    const client = clients[i];
    
    ClientMessager.send(client, {
      event : eventName,
      client: { id: clientID, identity: identity },
    });
  }
}
