import { Hono, type Context } from 'hono';
import { timing } from 'hono/timing';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';

import { auth, requireAuth } from './auth';

import { inflateSync as inflate, deflateSync as deflate } from 'fflate';

import { uint8ArrayToHex } from 'uint8array-extras';
import { poweredBy } from './utils/poweredBy';

import type { Env } from './env';
import { endTime, startTime } from './utils/timing';

const app = new Hono<Env>();

app.use(
	'*',
	cors({
		origin: ['https://discord.com', 'https://ptb.discord.com', 'https://canary.discord.com'],
		exposeHeaders: ['etag'],
	}),
);

app.use(poweredBy);
app.use(secureHeaders());
app.use(timing());

app.use(auth);

app.get('/', (c) => c.redirect(c.env.ROOT_REDIRECT || 'https://github.com/ryanccn/vendflare', 302));

app.use('/v1/settings', requireAuth);

app.get('/v1/settings', async (ctx) => {
	const userId = ctx.get('userId')!;

	startTime(ctx, 'readSettings');

	const settings = await ctx.env.DB.prepare('SELECT value, written FROM settings WHERE user_id = ?')
		.bind(userId)
		.first<{ value: string; written: number }>();

	endTime(ctx, 'readSettings');

	if (!settings) {
		return ctx.notFound();
	}

	const ifNoneMatch = ctx.req.header('if-none-match');
	if (ifNoneMatch && ifNoneMatch === settings.written.toString()) {
		return ctx.body(null, 304);
	}

	ctx.header('content-type', 'application/octet-stream');
	ctx.header('etag', settings.written.toString());

	startTime(ctx, 'compressData');
	const settingsData = new TextEncoder().encode(settings.value);
	const compressedSettings = deflate(settingsData);
	endTime(ctx, 'compressData');

	return ctx.body(compressedSettings);
});

app.put('/v1/settings', async (ctx) => {
	const userId = ctx.get('userId')!;

	if (ctx.req.header('content-type') !== 'application/octet-stream') {
		return ctx.json({ error: 'Content type must be application/octet-stream' }, 400);
	}

	if (!ctx.req.raw.body) {
		return ctx.json({ error: 'No body provided' }, 400);
	}

	startTime(ctx, 'receiveBuffer');
	const rawData = await ctx.req.arrayBuffer();
	endTime(ctx, 'receiveBuffer');

	const sizeLimit = ctx.env.SIZE_LIMIT ? Number.parseInt(ctx.env.SIZE_LIMIT) : null;
	if (sizeLimit && rawData.byteLength > sizeLimit) {
		return ctx.json({ error: 'Settings are too large' }, 413);
	}

	const now = Date.now();

	startTime(ctx, 'decompressData');
	const decompressed = inflate(new Uint8Array(rawData));
	const value = new TextDecoder().decode(decompressed);
	endTime(ctx, 'decompressData');

	startTime(ctx, 'writeSettings');

	await ctx.env.DB.prepare('INSERT INTO settings (user_id, value, written) VALUES (?, ?, ?) ON CONFLICT (user_id) DO UPDATE SET value = excluded.value, written = excluded.written')
		.bind(userId, value, now)
		.run();

	endTime(ctx, 'writeSettings');

	return ctx.json({ written: now });
});

app.delete('/v1/settings', async (ctx) => {
	const userId = ctx.get('userId')!;

	startTime(ctx, 'deleteSettings');

	await ctx.env.DB.prepare('DELETE FROM settings WHERE user_id = ?')
		.bind(userId)
		.run();

	endTime(ctx, 'deleteSettings');

	return ctx.body(null, 204);
});

app.get('/v1', (c) => c.json({ ping: 'pong' }));

app.delete('/v1/', requireAuth);
app.delete('/v1/', async (ctx) => {
	const userId = ctx.get('userId')!;

	startTime(ctx, 'deleteData');

	await ctx.env.DB.batch([
		ctx.env.DB.prepare('DELETE FROM secrets WHERE user_id = ?').bind(userId),
		ctx.env.DB.prepare('DELETE FROM settings WHERE user_id = ?').bind(userId),
	]);

	endTime(ctx, 'deleteData');

	return ctx.body(null, 204);
});

const defaultRedirectUri = (ctx: Context<Env>) => new URL('/v1/oauth/callback', ctx.req.url).toString();

app.get('/v1/oauth/callback', async (ctx) => {
	const code = ctx.req.query('code');
	if (code === undefined) {
		return ctx.json({ error: 'Missing code' }, 400);
	}

	const formData = new FormData();
	formData.append('client_id', ctx.env.DISCORD_CLIENT_ID);
	formData.append('client_secret', ctx.env.DISCORD_CLIENT_SECRET);
	formData.append('grant_type', 'authorization_code');
	formData.append('code', code);
	formData.append('redirect_uri', ctx.env.DISCORD_REDIRECT_URI || defaultRedirectUri(ctx));
	formData.append('scope', 'identify');

	startTime(ctx, 'obtainDiscordToken');

	const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
		method: 'POST',
		body: formData,
	});

	if (!tokenRes.ok) {
		return ctx.json({ error: 'Failed to authorize with Discord' }, 401);
	}

	// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
	const { access_token } = (await tokenRes.json()) as { access_token: string };

	endTime(ctx, 'obtainDiscordToken');
	startTime(ctx, 'fetchUserInfo');

	const userRes = await fetch('https://discord.com/api/users/@me', {
		headers: { Authorization: `Bearer ${access_token}` },
	});

	if (!userRes.ok) {
		return ctx.json({ error: 'Failed to retrieve account information' }, 500);
	}

	// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
	const { id: userId } = (await userRes.json()) as { id: string };

	endTime(ctx, 'fetchUserInfo');

	if (
		ctx.env.ALLOWED_USERS
		&& !ctx.env.ALLOWED_USERS.split(',').map((s) => s.trim()).includes(userId)
	) {
		return ctx.json({ error: 'Not whitelisted' }, 401);
	}

	startTime(ctx, 'obtainSecret');

	let secret = await ctx.env.DB.prepare('SELECT secret FROM secrets WHERE user_id = ?')
		.bind(userId)
		.first<{ secret: string }>()
		.then((row) => row?.secret);

	endTime(ctx, 'obtainSecret');

	if (!secret) {
		const randValues = new Uint8Array(64);
		crypto.getRandomValues(randValues);
		secret = uint8ArrayToHex(randValues);

		await ctx.env.DB.prepare('INSERT INTO secrets (user_id, secret) VALUES (?, ?)')
			.bind(userId, secret)
			.run();
	}

	return ctx.json({ secret });
});

app.get('/v1/oauth/settings', (ctx) => {
	return ctx.json({
		clientId: ctx.env.DISCORD_CLIENT_ID,
		redirectUri: ctx.env.DISCORD_REDIRECT_URI || defaultRedirectUri(ctx),
	});
});

export default app;
