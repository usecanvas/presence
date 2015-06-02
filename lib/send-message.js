'use strict';

module.exports = sendMessage;

function sendMessage(client, message) {
  message = JSON.stringify(message);
  client.send(message);
}
