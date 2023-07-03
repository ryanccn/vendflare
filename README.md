# Vendflare

A [Vencord](https://vencord.dev/) backend/cloud/API running on [Cloudflare Workers](https://workers.cloudflare.com/) with [Workers KV](https://developers.cloudflare.com/workers/runtime-apis/kv/) for storage.

The [official implementation](https://github.com/Vencord/Backend) uses Go and Redis.

## Setup

Deploy this worker on Cloudflare using [wrangler](https://developers.cloudflare.com/workers/wrangler/).

Change the bindings of the KV in `wrangler.toml` to the KV IDs on your own account.

An example of how you would do this:

```console
$ git clone https://github.com/ryanccn/vendflare.git
$ cd vendflare
$ pnpm i
$ pnpm deploy
```

Then [register a Discord application](https://discord.com/developers/applications) and set the OAuth client ID and secret as environment variables on your worker as `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET`, respectively.

You can set `ALLOWED_USERS` as a comma-separated list of user IDs to only allow some users to use this instance.

You can also set a `SIZE_LIMIT` to limit the size of the configuration (so that people don't use it as a cloud drive).

Set `ROOT_REDIRECT` for the URL to redirect to on the root URL, such as your personal website or [this video](https://www.youtube.com/watch?v=dQw4w9WgXcQ).

## License

AGPL v3
