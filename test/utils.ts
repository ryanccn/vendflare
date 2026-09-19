import { env } from 'cloudflare:workers';

export const makeUrl = (path: string) =>
	new URL(path, 'https://test.vendflare.local/').href;

export const setupTestingUser = async () => {
	await env.DB.prepare('INSERT INTO secrets (user_id, secret) VALUES (?, ?)')
		.bind('TESTING_USER', 'testing_secret')
		.run();
};

export const deflate = (text: string) =>
	new Response(new Blob([text]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer();

export const inflate = (res: Response) =>
	new Response(res.body!.pipeThrough(new DecompressionStream('deflate-raw'))).text();

export { default as worker } from '../src/index';
