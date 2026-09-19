import type { Context } from 'hono';
import { createMiddleware } from 'hono/factory';

import { getSecret } from './secrets';
import { isAllowedUser } from './utils/allowlist';
import { startTime, endTime } from './utils/timing';

import type { Env } from './env';

type AuthEnv = Env & { Variables: { userId: string } };

const resolveUserId = async (ctx: Context<AuthEnv>): Promise<string | null> => {
	const authHeader = ctx.req.header('authorization');
	if (!authHeader) {
		return null;
	}

	let token: string;

	try {
		token = atob(authHeader);
	} catch {
		return null;
	}

	const [secret, userId, ...rest] = token.split(':');

	if (!secret || userId === undefined || rest.length > 0 || !isAllowedUser(ctx.env.ALLOWED_USERS, userId)) {
		return null;
	}

	startTime(ctx, 'obtainSecret');
	const storedSecret = await getSecret(ctx.env.DB, userId);
	endTime(ctx, 'obtainSecret');

	if (storedSecret === undefined) {
		return null;
	}

	const enc = new TextEncoder();
	const [storedSecretBytes, secretBytes] = [enc.encode(storedSecret), enc.encode(secret)];

	return storedSecretBytes.length === secretBytes.length
		&& crypto.subtle.timingSafeEqual(storedSecretBytes, secretBytes)
		? userId
		: null;
};

export const requireAuth = createMiddleware<AuthEnv>(async (ctx, next) => {
	startTime(ctx, 'auth');
	const userId = await resolveUserId(ctx);
	endTime(ctx, 'auth');

	if (userId === null) {
		return ctx.json({ error: 'Unauthorized' }, 401);
	}

	ctx.set('userId', userId);
	await next();
});
