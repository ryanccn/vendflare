import { beforeEach } from 'vitest';
import { env } from 'cloudflare:workers';
import { applyD1Migrations } from 'cloudflare:test';

await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);

beforeEach(async () => {
	await env.DB.batch([
		env.DB.prepare('DELETE FROM secrets'),
		env.DB.prepare('DELETE FROM settings'),
		env.DB
			.prepare('INSERT INTO secrets (user_id, secret) VALUES (?, ?)')
			.bind('TESTING_USER', 'testing_secret'),
	]);
});
