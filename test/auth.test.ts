import { expect } from 'vitest';
import { vfTest, makeUrl } from './utils';

vfTest('correct secret results in success', async ({ worker, kv }) => {
	const res = await worker.fetch(
		new Request(makeUrl('/v1/'), {
			method: 'DELETE',
			headers: { Authorization: btoa('testing_secret:TESTING_USER') },
		}),
		{ KV: kv },
	);

	expect(res.ok).toEqual(true);
});

vfTest('incorrect secret results in failure: DELETE /v1', async ({ worker, kv }) => {
	const res = await worker.fetch(
		new Request(makeUrl('/v1/'), {
			method: 'DELETE',
			headers: { Authorization: btoa('not_testing_secret:TESTING_USER') },
		}),
		{ KV: kv },
	);

	expect(res.ok).toEqual(false);
	expect(res.status).toEqual(401);
});

vfTest('incorrect secret results in failure: PUT /v1/settings', async ({ worker, kv }) => {
	const res = await worker.fetch(
		new Request(makeUrl('/v1/settings'), {
			method: 'PUT',
			headers: { Authorization: btoa('not_testing_secret:TESTING_USER') },
		}),
		{ KV: kv },
	);

	expect(res.ok).toEqual(false);
	expect(res.status).toEqual(401);
});
