export const makeUrl = (path: string) =>
	new URL(path, 'https://test.vendflare.local/').href;

export const deflate = (text: string) =>
	new Response(new Blob([text]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer();

export const inflate = (res: Response) =>
	new Response(res.body!.pipeThrough(new DecompressionStream('deflate-raw'))).text();

export { default as worker } from '../src/index';
