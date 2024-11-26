import { expect } from 'vitest';
import { vfTest, makeUrl } from './utils';

vfTest('returns default redirect', async ({ worker }) => {
	const res = await worker.fetch(new Request(makeUrl('/'), { redirect: 'manual' }), {});

	expect(res.status).toEqual(302);
	expect(res.headers.get('location')).toEqual('https://github.com/ryanccn/vendflare');
});

vfTest('returns custom redirect', async ({ worker }) => {
	const res = await worker.fetch(
		new Request(makeUrl('/'), { redirect: 'manual' }),
		{ ROOT_REDIRECT: 'https://ryanccn.dev/' },
	);

	expect(res.status).toEqual(302);
	expect(res.headers.get('location')).toEqual('https://ryanccn.dev/');
});

vfTest('ping pong', async ({ worker }) => {
	const res = await worker.fetch(new Request(makeUrl('/v1')), {});
	expect(res.ok).toEqual(true);

	const data = await res.json();
	expect(data).toEqual({ ping: 'pong' });
});

vfTest('x-powered-by header', async ({ worker }) => {
	const res = await worker.fetch(new Request(makeUrl('/v1')), {});
	expect(res.ok).toEqual(true);
	expect(res.headers.get('x-powered-by')).toMatch(/^vendflare@[\dA-Za-z]+$/);
});
