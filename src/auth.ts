import { createMiddleware } from 'hono/factory';

import { startTime, endTime } from './utils/timing';
import { UserDataStore } from './store';

import type { Env } from './env';

export const auth = createMiddleware<Env>(async (ctx, next) => {
	startTime(ctx, 'auth');
	ctx.set('userId', null);
	ctx.set('store', null);

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

	const store = new UserDataStore(ctx.env, userId);
	startTime(ctx, 'getSecret');
	const storedSecret = await store.get('secret');
	endTime(ctx, 'getSecret');

	if (!storedSecret || storedSecret !== secret) {
		endTime(ctx, 'auth');
		await next();
		return;
	}

	ctx.set('userId', userId);
	ctx.set('store', store);

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
