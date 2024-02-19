/* eslint-disable unicorn/consistent-function-scoping */

import type { MiddlewareHandler } from 'hono';
import type { Env } from './env';

const copyHeader = (from: Headers, to: Headers, key: string, overrideToKey?: string) => {
	const value = from.get(key);
	if (value) {
		to.set(overrideToKey ?? key, value);
	}
};

type PlausibleEventPayload = {
	name: 'pageview';
	url: string;
	domain: string;
	referrer?: string;
};

export const recordEvent = async ({ url, headers }: { url: string | URL; headers: Headers }) => {
	const eventHeaders = new Headers();
	eventHeaders.set('content-type', 'application/json');

	copyHeader(headers, eventHeaders, 'user-agent');
	copyHeader(headers, eventHeaders, 'x-forwarded-for');
	copyHeader(headers, eventHeaders, 'x-real-ip');
	copyHeader(headers, eventHeaders, 'cf-connecting-ip');

	const body: PlausibleEventPayload = {
		name: 'pageview',
		url: url.toString(),
		domain: new URL(url).host,
	};

	const referrer = headers.get('referer');
	if (referrer) {
		body.referrer = referrer;
	}

	await fetch('https://plausible.io/api/event', {
		method: 'POST',
		headers: eventHeaders,
		body: JSON.stringify(body),
	});
};

export const analytics: () => MiddlewareHandler<Env> = () => async (ctx, next) => {
	await next();

	if (ctx.res.ok && ctx.env.ANALYTICS_ENABLED !== undefined) {
		ctx.executionCtx.waitUntil(recordEvent({ url: ctx.req.url, headers: ctx.req.raw.headers }));
	}
};
