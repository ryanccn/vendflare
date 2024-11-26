import { expect } from 'vitest';
import { vfTest, makeUrl } from './utils';

import { deflateSync, inflateSync } from 'fflate';

vfTest('unauthorized settings access is forbidden', async ({ worker, kv }) => {
	const res = await worker.fetch(
		new Request(makeUrl('/v1/settings'), { method: 'GET' }),
		{ KV: kv },
	);

	expect(res.status).toEqual(401);
});

vfTest('empty settings returns 404', async ({ worker, kv }) => {
	const res = await worker.fetch(
		new Request(makeUrl('/v1/settings'), {
			method: 'GET',
			headers: { authorization: btoa('testing_secret:TESTING_USER') },
		}),
		{ KV: kv },
	);

	expect(res.status).toEqual(404);
});

vfTest('settings are saved', async ({ worker, kv }) => {
	const putRes = await worker.fetch(
		new Request(makeUrl('/v1/settings'), {
			method: 'PUT',
			body: deflateSync(new TextEncoder().encode(JSON.stringify({ test: 'data' }))),
			headers: {
				'content-type': 'application/octet-stream',
				'authorization': btoa('testing_secret:TESTING_USER'),
			},
		}),
		{ KV: kv },
	);

	expect(putRes.ok).toEqual(true);

	const getRes = await worker.fetch(
		new Request(makeUrl('/v1/settings'), {
			method: 'GET',
			headers: { authorization: btoa('testing_secret:TESTING_USER') },
		}),
		{ KV: kv },
	);

	expect(getRes.ok).toEqual(true);

	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	const data = JSON.parse(new TextDecoder().decode(inflateSync(new Uint8Array(await getRes.arrayBuffer()))));

	expect(data).toEqual({ test: 'data' });
});

vfTest('size limit is enforced', async ({ worker, kv }) => {
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
			KV: kv,
			SIZE_LIMIT: 1,
		},
	);

	expect(putRes.status).toEqual(413);
});

vfTest('content-type is enforced', async ({ worker, kv }) => {
	const putRes = await worker.fetch(
		new Request(makeUrl('/v1/settings'), {
			method: 'PUT',
			body: 'testing_secret',
			headers: {
				'content-type': 'text/plain; encoding=utf-8',
				'authorization': btoa('testing_secret:TESTING_USER'),
			},
		}),
		{ KV: kv },
	);

	expect(putRes.status).toEqual(400);
});

vfTest('if-none-match header is observed', async ({ worker, kv }) => {
	const putRes = await worker.fetch(
		new Request(makeUrl('/v1/settings'), {
			method: 'PUT',
			body: deflateSync(new TextEncoder().encode(JSON.stringify({ test: 'data' }))),
			headers: {
				'content-type': 'application/octet-stream',
				'authorization': btoa('testing_secret:TESTING_USER'),
			},
		}),
		{ KV: kv },
	);

	expect(putRes.ok).toEqual(true);

	// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
	const { written } = (await putRes.json()) as { written: number };

	const getRes = await worker.fetch(
		new Request(makeUrl('/v1/settings'), {
			method: 'GET',
			headers: {
				'authorization': btoa('testing_secret:TESTING_USER'),
				'if-none-match': `${written}`,
			},
		}),
		{ KV: kv },
	);

	expect(getRes.status).toEqual(304);

	const getRes2 = await worker.fetch(
		new Request(makeUrl('/v1/settings'), {
			method: 'GET',
			headers: {
				'authorization': btoa('testing_secret:TESTING_USER'),
				'if-none-match': `${written + 1}`,
			},
		}),
		{ KV: kv },
	);

	expect(getRes2.status).toEqual(200);
});

vfTest('settings are deleted', async ({ worker, kv }) => {
	const putRes = await worker.fetch(
		new Request(makeUrl('/v1/settings'), {
			method: 'PUT',
			body: deflateSync(new TextEncoder().encode(JSON.stringify({ test: 'data' }))),
			headers: {
				'content-type': 'application/octet-stream',
				'authorization': btoa('testing_secret:TESTING_USER'),
			},
		}),
		{ KV: kv },
	);

	expect(putRes.status).toEqual(200);

	const getRes = await worker.fetch(
		new Request(makeUrl('/v1/settings'), {
			method: 'DELETE',
			headers: { authorization: btoa('testing_secret:TESTING_USER') },
		}),
		{ KV: kv },
	);

	expect(getRes.status).toEqual(204);

	const checkRes = await worker.fetch(
		new Request(makeUrl('/v1/settings'), {
			method: 'GET',
			headers: { authorization: btoa('testing_secret:TESTING_USER') },
		}),
		{ KV: kv },
	);

	expect(checkRes.status).toEqual(404);
});
