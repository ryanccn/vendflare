# Vendflare

A [Vencord](https://vencord.dev/) backend/cloud/API running on [Cloudflare Workers](https://workers.cloudflare.com/) with either [Workers KV](https://developers.cloudflare.com/workers/runtime-apis/kv/) or [Durable Objects](https://developers.cloudflare.com/workers/learning/using-durable-objects/) for storage.

The [official implementation](https://github.com/Vencord/Backend) uses Go and Redis.

## Getting started

Deploy this worker on Cloudflare using [wrangler](https://developers.cloudflare.com/workers/wrangler/).

Change the bindings of the KV in `wrangler.toml` to the KV IDs on your own account. You could also use [Durable Objects](https://developers.cloudflare.com/workers/learning/using-durable-objects/), which require subscribing to a paid plan on Cloudflare Workers; see [Storage Backends](#storage-backends) for more information.

An example of how you would do this:

```console
$ git clone https://github.com/ryanccn/vendflare.git
$ cd vendflare
$ pnpm install --frozen-lockfile
$ pnpm run deploy
```

Then [register a Discord application](https://discord.com/developers/applications) and set the OAuth client ID and secret as environment variables on your worker as `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET`, respectively.

You can set `ALLOWED_USERS` as a comma-separated list of user IDs to only allow some users to use this instance.

You can also set a `SIZE_LIMIT` to limit the size of the configuration (so that people don't use it as a cloud drive).

Set `ROOT_REDIRECT` for the URL to redirect to on the root URL.

## Storage backends

Vendflare's unified storage interface supports both [Workers KV](https://developers.cloudflare.com/workers/runtime-apis/kv/) and [Durable Objects](https://developers.cloudflare.com/workers/learning/using-durable-objects/).

KV is often faster to retrieve and is free for a fair amount of usage (more than enough for Vendflare), but it is **eventually consistent**, meaning that changes take a minute or so to propagate to Cloudflare datacenters around the world. This may pose issues with synchronization.

Durable Objects are **strongly consistent**, located only in one datacenter location and providing a storage API designed for consistency. However, using it requires subscribing to the Cloudflare Workers paid plan.

It is recommended to try KV first. If major synchronization issues arise (which is a small possibility), switch to Durable Objects. **Data is not shared between the two storage backends.**

When using KV, use [wrangler.toml](/wrangler.toml) to bind `KV` to the KV on your Cloudflare account.

When using Durable Objects, also use [wrangler.toml](/wrangler.toml) to bind `USER_DATA` to the `UserData` class exported by the worker.

Vendflare will automatically pick up whichever is defined (prioritizing `USER_DATA`) and use it for storage.

## License

AGPL v3
