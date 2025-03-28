import { env } from 'cloudflare:test';

export const makeUrl = (path: string) =>
	new URL(path, 'https://test.vendflare.local/').toString();

export const setupTestingUser = async () => {
	await env.DB.prepare('INSERT INTO secrets (user_id, secret) VALUES (?, ?)')
		.bind('TESTING_USER', 'testing_secret')
		.run();
};

export { default as worker } from '../src/index';
