'use strict';

const logfmt      = require('logfmt');
const sendMessage = require('./send-message');

module.exports = {
  handleNoIdentityProvided: handleNoIdentityProvided,
  handleNonUUIDSpace      : handleNonUUIDSpace,
  handleRedisError        : handleRedisError,
  handleUnparsableMessage : handleUnparsableMessage,
  handleUnrecognizedAction: handleUnrecognizedAction,
};

function handleNoIdentityProvided(client/*, message */) {
  logfmt.log({ error: 'No identity provided.' });
  sendMessage(client,
    { errors: [{ detail: 'No "identity" param provided.' }]});
}

function handleNonUUIDSpace(client, message) {
  logfmt.log({ error: `Non-UUID space: "${message.space}".` });
  sendMessage(client,
    { errors: [{ detail: 'Space provided is not a UUID.' }]});
}

function handleRedisError(client, error) {
  logfmt.error(error);
  sendMessage(client,
    { errors: [{ detail: 'An unexpected error occurred.' }]});
}

function handleUnparsableMessage(client/*, message */) {
  logfmt.log({ error: 'Unparsable message received' });
  sendMessage(client,
    { errors: [{ detail: 'Client passed non-JSON message.' }]});
}

function handleUnrecognizedAction(client, message) {
  logfmt.log({ error: `Unrecognized action: "${message.action}"` });
  sendMessage(client,
    { errors: [{ detail: 'Client passed unrecognized action in message.' }]});
}
