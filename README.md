# Longhouse [![Circle CI](https://circleci.com/gh/usecanvas/longhouse.svg?style=svg&circle-token=e95e3468f9e06bfea17fa9321426ef52dd3bca8e)](https://circleci.com/gh/usecanvas/longhouse)

Simple user presence.

## Prerequisites

- nvm

## Install

```sh
git clone git@github.com:usecanvas/longhouse.git
cd longhouse
nvm install
nvm use
npm i
echo "REDIS_URL=redis://localhost:6379" > .env
npm run dev
```

## Use

Longhouse provides an interface for establishing and tracking user presence in
a given namespace. It supports the following actions:

### Actions

#### `join`

Joins the given namespace:

```json
{
  "action"  : "join",
  "space"   : "5e01bce8-76eb-4179-abf4-358975da3c94",
  "identity": "user@example.com"
}
```

This will prompt Longhouse to send an ack message back with the current list of
members:

```json
{
  "action" : "join",
  "members": ["user@example.com"]
}
```

#### `ping`

Longhouse only marks users as present for a finite amount of time before
assuming they have left (the default is 60 seconds). A user can tell Longhouse
that they're still present by sending a ping:

```json
{
  "action"  : "ping",
  "space"   : "5e01bce8-76eb-4179-abf4-358975da3c94",
  "identity": "user@example.com"
}
```

Longhouse will acknowledge with a response ping:

```json
{
  "action": "ping"
}
```

#### `leave`

A user may leave a space by sending a leave message:

```json
{
  "action"  : "leave",
  "space"   : "5e01bce8-76eb-4179-abf4-358975da3c94",
  "identity": "user@example.com"
}
```

Longhouse will acknowledge by sending an ack leave message:

```json
{
  "action": "leave"
}
```

### Subscription Events

When a user has joined a space via a `join` action, they are then subscribed to
events on that action. They will be subscribed until they leave or their
connection closes.

Users will not receive subscription events for their own actions.

#### `remote join`

A user has joined a space to which the client is subscribed.

```json
{
  "action"  : "remote join",
  "space"   : "5e01bce8-76eb-4179-abf4-358975da3c94",
  "identity": "user@example.com"
}
```

#### `remote expire`

A user's presence has expired from a space to which the client is subscribed.

```json
{
  "action"  : "remote expire",
  "space"   : "5e01bce8-76eb-4179-abf4-358975da3c94",
  "identity": "user@example.com"
}
```

#### `remote leave`

A user has left a space to which the client is subscribed.

```json
{
  "action"  : "remote leave",
  "space"   : "5e01bce8-76eb-4179-abf4-358975da3c94",
  "identity": "user@example.com"
}
```

### Configuration

- `PRESENCE_TTL`: The value of presence TTL in ms, defaults to `60000`.

## Errors

When Longhouse encounters an error based on a user's message, it will send back
a message in this format:

```json
{
  "errors": [{ "detail": "No \"identity\" param provided."}]
}
```

Note the top-level "errors" key, which is an array of error objects, which each
have a single "detail" key.

## How does it work?

Longhouse is extremely simple. When a user joins, it sets a key in Redis with
the format `spaces.${spaceUUID}.${userIdentity}` with a value of the user
identity. The only validation it does is that the UUID is a v4 UUID and that
the identity param is present (it can be any value).

These keys have a default expire time of 60 seconds.

In order to determine who is present in a given space, Longhouse just gets every
key that matches the pattern `spaces.${spaceUUID}.*`. The user identity for each
present user is in the key itself, the values are only used for testing
purposes.

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
wscat -c ws://localhost:5000
> {"action":"join","space":"5e01bce8-76eb-4179-abf4-358975da3c94","identity":"user@example.com"}
  < {"action":"join","members":["user@example.com"]}
```
