import { expect, it } from 'vitest';
import { env } from 'cloudflare:test';
import { makeUrl, worker } from './utils';

it('returns default redirect', async () => {
	const res = await worker.fetch(new Request(makeUrl('/'), { redirect: 'manual' }), env);

	expect(res.status).toBe(302);
	expect(res.headers.get('location')).toBe('https://github.com/ryanccn/vendflare');
});

it('returns custom redirect', async () => {
	const res = await worker.fetch(
		new Request(makeUrl('/'), { redirect: 'manual' }),
		{ ROOT_REDIRECT: 'https://ryanccn.dev/' },
	);

	expect(res.status).toBe(302);
	expect(res.headers.get('location')).toBe('https://ryanccn.dev/');
});

it('ping pong', async () => {
	const res = await worker.fetch(new Request(makeUrl('/v1')), env);
	expect(res.ok).toBe(true);

	const data = await res.json();
	expect(data).toStrictEqual({ ping: 'pong' });
});

it('x-powered-by header', async () => {
	const res = await worker.fetch(new Request(makeUrl('/v1')), env);

	expect(res.ok).toBe(true);
	expect(res.headers.get('x-powered-by')).toBe('vendflare@__test');
});
