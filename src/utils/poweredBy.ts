import { createMiddleware } from 'hono/factory';
import type { Env } from '~/env';

export const poweredBy = createMiddleware<Env>(async (c, next) => {
	await next();
	c.header('x-powered-by', `vendflare@${VENDFLARE_REVISION}`);
});
