import worker from '@dist/worker';

import { test } from 'vitest';
import { KVNamespace } from '@miniflare/kv';
import { MemoryStorage } from '@miniflare/storage-memory';

export const makeUrl = (p: string) => new URL(p, 'https://vendflare.ryanccn.dev/').toString();

export const vfTest = test.extend<{
	worker: typeof worker;
	kv: KVNamespace;
}>({
	worker,

	// eslint-disable-next-line no-empty-pattern
	kv: async ({}, use) => {
		const storage = new MemoryStorage();
		const kv = new KVNamespace(storage);

		await kv.put('TESTING_USER:secret', 'testing_secret');

		await use(kv);
	},
});
