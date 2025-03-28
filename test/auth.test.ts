import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { env } from 'cloudflare:test';

import { makeUrl, worker } from './utils';
import { fetchMock } from 'cloudflare:test';

beforeAll(() => {
	fetchMock.activate();
	fetchMock.disableNetConnect();
});

afterEach(() => {
	fetchMock.assertNoPendingInterceptors();
});

it('correct secret results in success', async () => {
	const res = await worker.fetch(
		new Request(makeUrl('/v1/'), {
			method: 'DELETE',
			headers: { Authorization: btoa('testing_secret:TESTING_USER') },
		}),
		env,
	);

	expect(res.ok).toBe(true);
});

it('malformed (not base64) secret results in failure', async () => {
	const res = await worker.fetch(
		new Request(makeUrl('/v1/'), {
			method: 'DELETE',
			headers: { Authorization: '__malformed_testing_secret' },
		}),
		env,
	);

	expect(res.ok).toBe(false);
	expect(res.status).toBe(401);
});

it('malformed (base64) secret results in failure', async () => {
	const res = await worker.fetch(
		new Request(makeUrl('/v1/'), {
			method: 'DELETE',
			headers: { Authorization: btoa('__malformed_testing_secret') },
		}),
		env,
	);

	expect(res.ok).toBe(false);
	expect(res.status).toBe(401);
});

it('incorrect secret results in failure', async () => {
	const res = await worker.fetch(
		new Request(makeUrl('/v1/'), {
			method: 'DELETE',
			headers: { Authorization: btoa('not_testing_secret:TESTING_USER') },
		}),
		env,
	);

	expect(res.ok).toBe(false);
	expect(res.status).toBe(401);
});

it('disallowed user secret results in failure', async () => {
	const res = await worker.fetch(
		new Request(makeUrl('/v1/'), {
			method: 'DELETE',
			headers: { Authorization: btoa('not_testing_secret:TESTING_USER') },
		}),
		{
			...env,
			ALLOWED_USERS: '__no_allowed_users',
		},
	);

	expect(res.ok).toBe(false);
	expect(res.status).toBe(401);
});

describe('Discord authorization flow', () => {
	it('succeeds with existing user', async () => {
		fetchMock
			.get('https://discord.com')
			.intercept({ path: '/api/oauth2/token', method: 'POST' })
			.reply(200, JSON.stringify({ access_token: 'abcde' }));

		fetchMock
			.get('https://discord.com')
			.intercept({ path: '/api/users/@me', headers: { authorization: 'Bearer abcde' } })
			.reply(200, JSON.stringify({ id: 'TESTING_USER' }));

		const res = await worker.fetch(
			new Request(makeUrl('/v1/oauth/callback?code=__test_code')),
			env,
		);

		const { secret } = await res.json<{ secret: string }>();

		expect(res.ok).toBe(true);
		expect(secret).toBeTypeOf('string');

		const res2 = await worker.fetch(
			new Request(makeUrl('/v1/'), {
				method: 'DELETE',
				headers: { Authorization: btoa(`${secret}:TESTING_USER`) },
			}),
			env,
		);

		expect(res2.ok).toBe(true);
	});

	it('succeeds with new user', async () => {
		fetchMock
			.get('https://discord.com')
			.intercept({ path: '/api/oauth2/token', method: 'POST' })
			.reply(200, JSON.stringify({ access_token: 'abcde' }));

		fetchMock
			.get('https://discord.com')
			.intercept({ path: '/api/users/@me', headers: { authorization: 'Bearer abcde' } })
			.reply(200, JSON.stringify({ id: 'TESTING_USER_2' }));

		const res = await worker.fetch(
			new Request(makeUrl('/v1/oauth/callback?code=__test_code')),
			{
				...env,
				ALLOWED_USERS: 'TESTING_USER,TESTING_USER_2',
			},
		);

		const { secret } = await res.json<{ secret: string }>();

		expect(res.ok).toBe(true);
		expect(secret).toBeTypeOf('string');

		const res2 = await worker.fetch(
			new Request(makeUrl('/v1/'), {
				method: 'DELETE',
				headers: { Authorization: btoa(`${secret}:TESTING_USER_2`) },
			}),
			env,
		);

		expect(res2.ok).toBe(true);
	});

	it('fails without code', async () => {
		const res = await worker.fetch(
			new Request(makeUrl('/v1/oauth/callback')),
			env,
		);

		expect(res.ok).toBe(false);
		expect(res.status).toBe(400);
	});

	it('fails if not allowlisted', async () => {
		fetchMock
			.get('https://discord.com')
			.intercept({ path: '/api/oauth2/token', method: 'POST' })
			.reply(200, JSON.stringify({ access_token: 'abcde' }));

		fetchMock
			.get('https://discord.com')
			.intercept({ path: '/api/users/@me', headers: { authorization: 'Bearer abcde' } })
			.reply(200, JSON.stringify({ id: 'TESTING_USER_2' }));

		const res = await worker.fetch(
			new Request(makeUrl('/v1/oauth/callback?code=__test_code')),
			{
				...env,
				ALLOWED_USERS: 'TESTING_USER',
			},
		);

		expect(res.ok).toBe(false);
		expect(res.status).toBe(401);
	});

	it('fails if /api/oauth2/token fails', async () => {
		fetchMock
			.get('https://discord.com')
			.intercept({ path: '/api/oauth2/token', method: 'POST' })
			.reply(500);

		const res = await worker.fetch(
			new Request(makeUrl('/v1/oauth/callback?code=__test_code')),
			env,
		);

		expect(res.ok).toBe(false);
		expect(res.status).toBe(401);
	});

	it('fails if /api/users/@me fails', async () => {
		fetchMock
			.get('https://discord.com')
			.intercept({ path: '/api/oauth2/token', method: 'POST' })
			.reply(200, JSON.stringify({ access_token: 'abcde' }));

		fetchMock
			.get('https://discord.com')
			.intercept({ path: '/api/users/@me', headers: { authorization: 'Bearer abcde' } })
			.reply(500);

		const res = await worker.fetch(
			new Request(makeUrl('/v1/oauth/callback?code=__test_code')),
			env,
		);

		expect(res.ok).toBe(false);
		expect(res.status).toBe(500);
	});
});

describe('Discord OAuth settings endpoint', () => {
	it('works', async () => {
		const res = await worker.fetch(
			new Request(makeUrl('/v1/oauth/settings')),
			{
				...env,
				DISCORD_CLIENT_ID: '__test_client_id',
				DISCORD_REDIRECT_URI: '__test_redirect_uri',
			},
		);

		const data = await res.json();

		expect(res.ok).toBe(true);
		expect(data).toStrictEqual({
			clientId: '__test_client_id',
			redirectUri: '__test_redirect_uri',
		});
	});

	it('works with default redirect URI', async () => {
		const res = await worker.fetch(
			new Request(makeUrl('/v1/oauth/settings')),
			{
				...env,
				DISCORD_CLIENT_ID: '__test_client_id',
				DISCORD_REDIRECT_URI: undefined,
			},
		);

		const data = await res.json();

		expect(res.ok).toBe(true);
		expect(data).toStrictEqual({
			clientId: '__test_client_id',
			redirectUri: makeUrl('/v1/oauth/callback'),
		});
	});
});
