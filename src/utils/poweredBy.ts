import { type MiddlewareHandler } from "hono";

export const poweredBy: () => MiddlewareHandler = () => async (c, next) => {
	await next();
	c.header("x-powered-by", `vendflare@${VENDFLARE_REVISION}`);
};
