# Longhouse [![Circle CI](https://circleci.com/gh/usecanvas/longhouse.svg?style=svg&circle-token=e95e3468f9e06bfea17fa9321426ef52dd3bca8e)](https://circleci.com/gh/usecanvas/longhouse)

A user presence service.

## Prerequisites

- nvm

## Install

```sh
git clone git@github.com:usecanvas/longhouse.git
cd longhouse
nvm install
nvm use
npm install
echo "REDIS_URL=redis://localhost:6379" > .env
echo "PRESENCE_TTL=30000" >> .env
npm run dev
```

## Use

Longhouse tracks user presence as soon as they connect. To connect to space in
Longhouse, open a WebSocket connection to a URL like:

```
wss://longhouse.example.com/space_uuid?identity=email@example.com
```

After joining, the client will quickly receive a message with the current
clients connected to the space:

```json
{
  "clients": [
    { "id": "123", "identity": "email@example.com", "spaceID": "space_uuid", "joinedAt": "2015-06-05T21:09:26.480Z" },
    { "id": "456", "identity": "user2@example.com", "spaceID": "space_uuid", "joinedAt": "2015-06-05T21:09:28.493Z" }
  ]
}
```

### Actions

#### `ping`

Sending this action will renew the client's presence lease.

This is currently the only action that should be sent to Longhouse. It needs to
be sent less frequently than the value of `$PRESENCE_TTL` (in milliseconds).

```json
{"action": "ping"}
```

### Remote Events

When relevant events happen on remote clients, Longhouse will send a message to
each client connected to the space where the event occurred.

#### `remote join`

A client has joined the space.

```json
{
  "event": "remote join",
  "client": { "id": "456", "identity": "user2@example.com", "spaceID": "space_uuid", "joinedAt": "2015-06-05T21:09:28.493Z" }
}
```

#### `remote leave`

A client has left the space (either by expiration or closing their connection).

```json
{
  "event": "remote leave",
  "client": { "id": "456", "identity": "user2@example.com", "spaceID": "space_uuid", "joinedAt": "2015-06-05T21:09:28.493Z" }
}
```

### Configuration

- `$PRESENCE_TTL` The time (in ms) after which client presence will
  automatically expire
- `$REDIS_URL` The URL to the Redis server

### Errors

When an error occurs that is relevant to the client, an error message will be
sent in this format:

```json
{ "error": "Error message" }
```

An error may or may not result in Longhouse terminating the socket connection.

## How does it work?

Longhouse is extremely simple. When a user joins, it sets a key in Redis with
the format `longhouse/spaces/${spaceID}/${clientUUID}/${userIdentity}/${joinedAt}` with a
value of the user identity.

These keys have a default expire time of 60 seconds.

In order to determine who is present in a given space, Longhouse just gets every
key that matches the pattern `longhouse/spaces/${spaceID}.*`. The user identity
for each present user is in the key itself, and the values are only used for
testing purposes.

## Testing

The unit tests can be run with `npm test`. A Redis server must be running, but
be aware that **the tests will call FLUSHDB after every test**.

Another useful tool for testing is `wscat`:

```bash
npm i -g wscat
```

Then, one can connect to Longhouse using wscat once they've started the
server:

```bash
# Terminal 1
wscat -c ws://localhost:5000/space-id?identity=user@example.com
>
  < {"clients": [
      { "id": "123", "identity": "user@example.com", "spaceID": "space-id", "joinedAt": "2015-06-05T21:09:26.480Z" }
    ]

# Terminal 2
wscat -c ws://localhost:5000/space-id?identity=another-user@example.com
>
  < {"clients": [
      { "id": "123", "identity": "user@example.com", "spaceID": "space-id", "joinedAt": "2015-06-05T21:09:26.480Z" },
      { "id": "456", "identity": "user2@example.com", "spaceID": "space-id", "joinedAt": "2015-06-05T21:09:28.493Z" }
    ]
```
