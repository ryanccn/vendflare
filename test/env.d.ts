import type { Bindings } from '~/env';

declare global {
	namespace Cloudflare {
		interface Env extends Bindings {
			TEST_MIGRATIONS: import('cloudflare:test').D1Migration[];
		}
	}
}
