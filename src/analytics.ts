import type { MiddlewareHandler } from "hono";
import type { Env } from "./env";

const copyHeader = (from: Headers, to: Headers, key: string, overrideToKey?: string) => {
	const value = from.get(key);
	if (value) {
		to.set(overrideToKey ?? key, value);
	}
};

export const recordEvent = async ({ url, headers }: { url: string | URL; headers: Headers }) => {
	const eventHeaders = new Headers();
	eventHeaders.set("content-type", "application/json");

	copyHeader(headers, eventHeaders, "user-agent");
	copyHeader(headers, eventHeaders, "x-forwarded-for");
	copyHeader(headers, eventHeaders, "cf-connecting-ip", "x-forwarded-for");

	const body = {
		name: "pageview",
		url: url.toString(),
		domain: new URL(url).host,
	};

	await fetch("https://plausible.io/api/event", {
		method: "POST",
		headers: eventHeaders,
		body: JSON.stringify(body),
	});
};

export const analytics: () => MiddlewareHandler<Env> = () => async (ctx, next) => {
	if (ctx.env.ANALYTICS_ENABLED !== undefined) {
		ctx.executionCtx.waitUntil(recordEvent({ url: ctx.req.url, headers: ctx.req.raw.headers }));
	}

	await next();
};
