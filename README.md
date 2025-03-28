# Vendflare

A [Vencord](https://vencord.dev/) backend/cloud/API running on [Cloudflare Workers](https://workers.cloudflare.com/) with [D1](https://developers.cloudflare.com/d1/).

The [official implementation](https://github.com/Vencord/Vencloud) uses monolithic Go and Redis.

## Getting started

Set the bindings of the D1 database in `wrangler.toml` to the D1 database IDs on your own account; run `wrangler d1 create <name>` to create a database if you do not already have one set up.

[Register a Discord application](https://discord.com/developers/applications) and set the OAuth client ID and secret as environment variables on your worker as `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET`, respectively.

Then, deploy this worker on Cloudflare using [wrangler](https://developers.cloudflare.com/workers/wrangler/).

You can set `ALLOWED_USERS` as a comma-separated list of user IDs to only allow some users to use this instance. You can also set a `SIZE_LIMIT` to limit the size of the configuration (so that people don't use it as a cloud drive). Set `ROOT_REDIRECT` for the URL to redirect to on the root URL.

## Testing

Tests are powered by [Vitest](https://vitest.dev/). Tests utilize an ephemeral Cloudflare Workers environment that emulates Cloudflare Workers' actual runtime environment.

## License

GNU AGPL v3
