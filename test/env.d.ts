import type { Bindings } from '~/env';

declare module 'cloudflare:test' {
	interface ProvidedEnv extends Bindings {
		TEST_MIGRATIONS: D1Migration[];
	}
}
