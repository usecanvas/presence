'use strict';

const Client         = require('./client');
const ClientMessager = require('./client-messager');
const ClientRegister = require('./client-register');
const Redis          = require('./redis');
const subscriber     = Redis.createClient();
const KEY_SPLITTER   = Client.KEY_SPLITTER;

/**
 * Observes Redis keyspace events and notifies clients of updates
 *
 * @module Observer
 */

module.exports = { start: start };

/**
 * Start the subscription and observance of keyspace events.
 *
 * @static
 * @return {Promise} A promise resolved when the subscription starts
 */
function start() {
  subscriber.on('pmessage', handleMessage);
  return subscriber.psubscribeAsync(`__keyspace@*__:longhouse${KEY_SPLITTER}spaces${KEY_SPLITTER}*`);
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
  const presenceKey = channel.split(':').slice(1).join(':');
  const eventName   = message;
  const subject     = Client.parsePresenceKey(presenceKey);

  switch (eventName) {
    case 'set':
      publishEvent('remote join', subject);
      break;
    case 'expired':
      expireClient(ClientRegister.getClient(subject.id));
      publishEvent('remote leave', subject);
      break;
    case 'del':
      publishEvent('remote leave', subject);
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
 * @param {Client} subject The subject client
 */
function publishEvent(eventName, subject) {
  const clients = ClientRegister.clientsInSpace(subject.spaceID);

  for (let i = 0, len = clients.length; i < len; i++) {
    const client = clients[i];

    ClientMessager.send(client, {
      event : eventName,
      client: Client.serialize(subject),
    });
  }
}
