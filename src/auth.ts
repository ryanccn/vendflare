import { createMiddleware } from 'hono/factory';

import { startTime, endTime } from './utils/timing';

import type { Env } from './env';

export const auth = createMiddleware<Env>(async (ctx, next) => {
	startTime(ctx, 'auth');
	ctx.set('userId', null);

	const authHeader = ctx.req.header('authorization');
	if (!authHeader) {
		endTime(ctx, 'auth');
		await next();
		return;
	}

	let token: string;

	try {
		token = atob(authHeader);
	} catch {
		endTime(ctx, 'auth');
		await next();
		return;
	}

	const [secret, userId, ...rest] = token.split(':');

	if (secret === undefined || userId === undefined || rest.length > 0) {
		endTime(ctx, 'auth');
		await next();
		return;
	}

	if (ctx.env.ALLOWED_USERS && !ctx.env.ALLOWED_USERS.split(',').includes(userId)) {
		endTime(ctx, 'auth');
		await next();
		return;
	}

	startTime(ctx, 'obtainSecret');

	const storedSecret = await ctx.env.DB.prepare('SELECT secret FROM secrets WHERE user_id = ?')
		.bind(userId)
		.first<{ secret: string }>()
		.then((row) => row?.secret);

	endTime(ctx, 'obtainSecret');

	const enc = new TextEncoder();
	const [storedSecretBytes, secretBytes] = [enc.encode(storedSecret), enc.encode(secret)];

	if (
		storedSecretBytes.length !== secretBytes.length
		|| !crypto.subtle.timingSafeEqual(storedSecretBytes, secretBytes)
	) {
		endTime(ctx, 'auth');
		await next();
		return;
	}

	ctx.set('userId', userId);

	endTime(ctx, 'auth');
	await next();
});

export const requireAuth = createMiddleware<Env>(async (ctx, next) => {
	const userId = ctx.get('userId');
	if (userId === null) {
		return ctx.json({ error: 'Unauthorized' }, 401);
	}

	await next();
});
