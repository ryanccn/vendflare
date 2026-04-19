import { defineConfig } from 'vitest/config';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers';
import path from 'node:path';

const migrationsPath = path.join(import.meta.dirname, 'migrations');
const migrations = await readD1Migrations(migrationsPath);

export default defineConfig({
	define: {
		VENDFLARE_REVISION: JSON.stringify('__test'),
	},

	plugins: [
		cloudflareTest({
			wrangler: { configPath: './wrangler.toml' },
			miniflare: {
				bindings: {
					TEST_MIGRATIONS: migrations,
				},
			},
		}),
	],

	test: {
		setupFiles: ['./test/setup.ts'],

		coverage: {
			provider: 'istanbul',
			include: ['src'],
		},
	},
});
