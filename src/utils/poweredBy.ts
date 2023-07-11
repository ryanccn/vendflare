import { type MiddlewareHandler } from "hono";

export const poweredBy: MiddlewareHandler = async (c, next) => {
	c.header("x-powered-by", `vendflare@${VENDFLARE_REVISION}`);
	await next();
};
