'use strict';

const logfmt      = require('logfmt');
const sendMessage = require('./send-message');

/**
 * A module of responses for errors to send to clients.
 * @module errorHandlers
 */

module.exports = {
  handleAlreadyJoined     : handleAlreadyJoined,
  handleNoIdentityProvided: handleNoIdentityProvided,
  handleNonUUIDSpace      : handleNonUUIDSpace,
  handleRedisError        : handleRedisError,
  handleUnparsableMessage : handleUnparsableMessage,
  handleUnrecognizedAction: handleUnrecognizedAction,
};

/**
 * Send a response for when a client who is trying to join has already joined.
 * @param {ws.WebSocket} client The client who sent the bad message
 */
function handleAlreadyJoined(client/*, message */) {
  logfmt.log({ error: 'Already joined.' });
  sendMessage(client,
    { errors: [{ detail: 'You have already joined a space.' }]});
}

/**
 * Send a response for when a client has not provided an "identity" parameter.
 * @param {ws.WebSocket} client The client who sent the bad message
 */
function handleNoIdentityProvided(client/*, message */) {
  logfmt.log({ error: 'No identity provided.' });
  sendMessage(client,
    { errors: [{ detail: 'No "identity" param provided.' }]});
}

/**
 * Send a response for when a client has not provided a "space" which is a UUID.
 * @param {ws.WebSocket} client The client who sent the bad message
 * @param {Object} message The message sent by the client
 */
function handleNonUUIDSpace(client, message) {
  logfmt.log({ error: `Non-UUID space: "${message.space}".` });
  sendMessage(client,
    { errors: [{ detail: 'Space provided is not a UUID.' }]});
}

/**
 * Send a response for when a client whose message has caused a Redis error.
 * @param {ws.WebSocket} client The client who sent the message
 * @param {Error} error The error returned by the Redis operation
 */
function handleRedisError(client, error) {
  logfmt.error(error);
  sendMessage(client,
    { errors: [{ detail: 'An unexpected error occurred.' }]});
}

/**
 * Send a response for when a client has sent a non-JSON message
 * @param {ws.WebSocket} client The client who sent the bad message
 */
function handleUnparsableMessage(client/*, message */) {
  logfmt.log({ error: 'Unparsable message received' });
  sendMessage(client,
    { errors: [{ detail: 'Client passed non-JSON message.' }]});
}

/**
 * Send a response for when a client has sent an unrecognized action
 * @param {ws.WebSocket} client The client who sent the bad message
 * @param {Object} message The message sent by the client
 */
function handleUnrecognizedAction(client, message) {
  logfmt.log({ error: `Unrecognized action: "${message.action}"` });
  sendMessage(client,
    { errors: [{ detail: 'Client passed unrecognized action in message.' }]});
}
