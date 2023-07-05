# Vendflare

A [Vencord](https://vencord.dev/) backend/cloud/API running on [Cloudflare Workers](https://workers.cloudflare.com/) with [Workers KV](https://developers.cloudflare.com/workers/runtime-apis/kv/), [Durable Objects](https://developers.cloudflare.com/workers/learning/using-durable-objects/), or [Upstash Redis](https://docs.upstash.com/redis) for storage.

The [official implementation](https://github.com/Vencord/Backend) uses monolithic Go and Redis.

## Getting started

Deploy this worker on Cloudflare using [wrangler](https://developers.cloudflare.com/workers/wrangler/).

Change the bindings of the KV in `wrangler.toml` to the KV IDs on your own account. You could also use [Durable Objects](https://developers.cloudflare.com/workers/learning/using-durable-objects/), which require subscribing to a paid plan on Cloudflare Workers; see [Storage backends](#storage-backends) for more information.

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

Vendflare's unified storage interface supports [Workers KV](https://developers.cloudflare.com/workers/runtime-apis/kv/), [Durable Objects](https://developers.cloudflare.com/workers/learning/using-durable-objects/), and [Upstash Redis](https://docs.upstash.com/redis).

KV is often faster to retrieve and is free for a fair amount of usage (more than enough for Vendflare), but it is **eventually consistent**, meaning that changes take a minute or so to propagate to Cloudflare datacenters around the world. This may pose issues with synchronization.

Durable Objects are **strongly consistent**, located only in one datacenter location closest to the user who triggered the creation of the Object and providing a storage API designed for consistency. However, using it requires subscribing to the Cloudflare Workers paid plan.

Upstash Redis can both be **strongly _or_ eventually consistent**. With [Global Replication](https://docs.upstash.com/redis/features/globaldatabase) turned on, the database is replicated worldwide but the consistency will be eventual. When located in only one datacenter location (which is the default and provides more generous free usage), it's a good idea to turn on [Smart Placement](https://developers.cloudflare.com/workers/platform/smart-placement/), which places the Cloudflare Worker close to the database instead of near the uer.

It is recommended to try KV first. If major synchronization issues arise (which is a small possibility), switch to Durable Objects or Upstash Redis. **Data is not shared between the storage backends.**

When using KV, use `wrangler.toml` to bind `KV` to the KV on your Cloudflare account.

When using Durable Objects, also use `wrangler.toml` to bind `USER_DATA` to the `UserData` class exported by the worker.

When using Upstash Redis, set the `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` secrets in the Cloudflare dashboard.

Vendflare will automatically pick up whichever is defined (Durable Objects > KV > Upstash Redis) and use it for storage.

## Builds

By default, the deployed Cloudflare worker uses the `dist/worker.js` build, which supports KV, Durable Objects, and Upstash. It also uses the default [Hono preset](https://hono.dev/api/presets), which includes a more performant but larger bundle size router (recommended). The tiny preset includes a much smaller but less performant router.

One recommended optimization is to use the build that only supports the storage backend that you are actually using.

| Build                         | KV  | Durable Objects | Upstash | Hono preset | Size   |
| ----------------------------- | --- | --------------- | ------- | ----------- | ------ |
| `dist/worker.js`              | ✅  | ✅              | ✅      | Default     | ~33 kB |
| `dist/worker.kv.js`           | ✅  | ❌              | ❌      | Default     | ~29 kB |
| `dist/worker.do.js`           | ❌  | ✅              | ❌      | Default     | ~30 kB |
| `dist/worker.upstash.js`      | ❌  | ❌              | ✅      | Default     | ~31 kB |
| `dist/worker.tiny.js`         | ✅  | ✅              | ✅      | Tiny        | ~26 kB |
| `dist/worker.kv.tiny,js`      | ✅  | ❌              | ❌      | Tiny        | ~22 kB |
| `dist/worker.do.tiny.js`      | ❌  | ✅              | ❌      | Tiny        | ~23 kB |
| `dist/worker.upstash.tiny,js` | ❌  | ❌              | ✅      | iny         | ~23 kB |

You can change what build you use by going to `wrangler.toml` and editing the `main` field to the path of the build that you want to use.

## License

AGPL v3
