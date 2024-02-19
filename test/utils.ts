import { KVNamespace } from '@miniflare/kv';
import { MemoryStorage } from '@miniflare/storage-memory';

export const makeUrl = (p: string) => new URL(p, 'https://vendflare.ryanccn.dev/').toString();

export const getTestingKV = async (opts?: { initializeUser?: boolean }) => {
	const storage = new MemoryStorage();
	const kv = new KVNamespace(storage);

	if (opts?.initializeUser === true) {
		await kv.put('TESTING_USER:secret', 'bleh');
	}

	return kv;
};
