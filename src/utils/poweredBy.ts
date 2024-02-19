import { type MiddlewareHandler } from 'hono';

// eslint-disable-next-line unicorn/consistent-function-scoping
export const poweredBy: () => MiddlewareHandler = () => async (c, next) => {
	await next();
	c.header('x-powered-by', `vendflare@${VENDFLARE_REVISION}`);
};
