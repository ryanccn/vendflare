import {
	defineWorkersProject,
	readD1Migrations,
} from '@cloudflare/vitest-pool-workers/config';
import path from 'node:path';

const migrationsPath = path.join(import.meta.dirname, 'migrations');

export default defineWorkersProject(async () => {
	const migrations = await readD1Migrations(migrationsPath);

	return {
		define: {
			VENDFLARE_REVISION: JSON.stringify('__test'),
		},

		test: {
			setupFiles: ['./test/setup.ts'],

			coverage: {
				provider: 'istanbul',
				include: ['src'],
			},

			poolOptions: {
				workers: {
					wrangler: {
						configPath: './wrangler.toml',
					},

					miniflare: {
						bindings: {
							TEST_MIGRATIONS: migrations,
						},
					},
				},
			},
		},
	};
});
