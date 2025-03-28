import { build } from 'esbuild';

import { bold } from 'kleur/colors';
import { x } from 'tinyexec';

import { readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

try {
	for (const f of await readdir('dist')) {
		await rm(join('dist', f));
	}
} catch (error: unknown) {
	if (!(error instanceof Error && typeof error.message.includes('ENOENT'))) {
		throw error;
	}
}

const revision = await x('git', ['rev-parse', '--short', 'HEAD']).then((p) => p.stdout.trim());

console.log(bold(`vendflare@${revision}`));

await build({
	entryPoints: ['src/index.ts'],
	outfile: 'dist/index.js',
	format: 'esm',
	platform: 'neutral',
	bundle: true,
	minify: true,
	define: {
		VENDFLARE_REVISION: JSON.stringify(revision),
	},
	logLevel: 'info',
});

await writeFile(
	'dist/index.d.ts',
	`import worker from '../src/index.js';
export default worker;
`,
);
