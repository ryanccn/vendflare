import { it, expect } from 'vitest';
import { env } from 'cloudflare:test';

import { makeUrl, worker } from './utils';
import { deflateSync, inflateSync } from 'fflate';

it('unauthorized settings access is forbidden', async () => {
	const res = await worker.fetch(
		new Request(makeUrl('/v1/settings'), { method: 'GET' }),
		env,
	);

	expect(res.status).toBe(401);
});

it('empty settings returns 404', async () => {
	const res = await worker.fetch(
		new Request(makeUrl('/v1/settings'), {
			method: 'GET',
			headers: { authorization: btoa('testing_secret:TESTING_USER') },
		}),
		env,
	);

	expect(res.status).toBe(404);
});

it('settings are saved', async () => {
	const putRes = await worker.fetch(
		new Request(makeUrl('/v1/settings'), {
			method: 'PUT',
			body: deflateSync(new TextEncoder().encode(JSON.stringify({ test: 'data' }))),
			headers: {
				'content-type': 'application/octet-stream',
				'authorization': btoa('testing_secret:TESTING_USER'),
			},
		}),
		env,
	);

	expect(putRes.ok).toBe(true);

	const getRes = await worker.fetch(
		new Request(makeUrl('/v1/settings'), {
			method: 'GET',
			headers: { authorization: btoa('testing_secret:TESTING_USER') },
		}),
		env,
	);

	expect(getRes.ok).toBe(true);

	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	const data = JSON.parse(new TextDecoder().decode(inflateSync(new Uint8Array(await getRes.arrayBuffer()))));

	expect(data).toStrictEqual({ test: 'data' });
});

it('empty settings are rejected', async () => {
	const putRes = await worker.fetch(
		new Request(makeUrl('/v1/settings'), {
			method: 'PUT',
			body: null,
			headers: {
				'content-type': 'application/octet-stream',
				'authorization': btoa('testing_secret:TESTING_USER'),
			},
		}),
		env,
	);

	expect(putRes.ok).toBe(false);
});

it('size limit is enforced', async () => {
	const putRes = await worker.fetch(
		new Request(makeUrl('/v1/settings'), {
			method: 'PUT',
			body: deflateSync(new TextEncoder().encode(JSON.stringify({ test: 'data' }))),
			headers: {
				'content-type': 'application/octet-stream',
				'authorization': btoa('testing_secret:TESTING_USER'),
			},
		}),
		{
			...env,
			SIZE_LIMIT: 1,
		},
	);

	expect(putRes.status).toBe(413);
});

it('content-type is enforced', async () => {
	const putRes = await worker.fetch(
		new Request(makeUrl('/v1/settings'), {
			method: 'PUT',
			body: 'testing_secret',
			headers: {
				'content-type': 'text/plain; encoding=utf-8',
				'authorization': btoa('testing_secret:TESTING_USER'),
			},
		}),
		env,
	);

	expect(putRes.status).toBe(400);
});

it('if-none-match header is observed', async () => {
	const putRes = await worker.fetch(
		new Request(makeUrl('/v1/settings'), {
			method: 'PUT',
			body: deflateSync(new TextEncoder().encode(JSON.stringify({ test: 'data' }))),
			headers: {
				'content-type': 'application/octet-stream',
				'authorization': btoa('testing_secret:TESTING_USER'),
			},
		}),
		env,
	);

	expect(putRes.ok).toBe(true);

	const { written } = (await putRes.json<{ written: number }>());

	const getRes = await worker.fetch(
		new Request(makeUrl('/v1/settings'), {
			method: 'GET',
			headers: {
				'authorization': btoa('testing_secret:TESTING_USER'),
				'if-none-match': `${written}`,
			},
		}),
		env,
	);

	expect(getRes.status).toBe(304);

	const getRes2 = await worker.fetch(
		new Request(makeUrl('/v1/settings'), {
			method: 'GET',
			headers: {
				'authorization': btoa('testing_secret:TESTING_USER'),
				'if-none-match': `${written + 1}`,
			},
		}),
		env,
	);

	expect(getRes2.status).toBe(200);
});

it('settings are deleted', async () => {
	const putRes = await worker.fetch(
		new Request(makeUrl('/v1/settings'), {
			method: 'PUT',
			body: deflateSync(new TextEncoder().encode(JSON.stringify({ test: 'data' }))),
			headers: {
				'content-type': 'application/octet-stream',
				'authorization': btoa('testing_secret:TESTING_USER'),
			},
		}),
		env,
	);

	expect(putRes.status).toBe(200);

	const getRes = await worker.fetch(
		new Request(makeUrl('/v1/settings'), {
			method: 'DELETE',
			headers: { authorization: btoa('testing_secret:TESTING_USER') },
		}),
		env,
	);

	expect(getRes.status).toBe(204);

	const checkRes = await worker.fetch(
		new Request(makeUrl('/v1/settings'), {
			method: 'GET',
			headers: { authorization: btoa('testing_secret:TESTING_USER') },
		}),
		env,
	);

	expect(checkRes.status).toBe(404);
});
