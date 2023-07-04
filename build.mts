/* eslint-env node */

import { BuildOptions, build } from "esbuild";

import { bold, cyan, dim, green, magenta, blue, red, yellow } from "kleur/colors";
import { execa } from "execa";

import { readFile } from "node:fs/promises";
import { join } from "node:path";

const size = async (f: string) => {
	const data = await readFile(f);

	let bytes = data.byteLength;
	const thresh = 1000;

	if (Math.abs(bytes) < thresh) {
		return bytes + " B";
	}

	const units = ["kB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
	let u = -1;
	const r = 10;

	do {
		bytes /= thresh;
		++u;
	} while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);

	return bytes.toFixed(1) + " " + units[u];
};

const commonOptions = {
	entryPoints: ["src/worker.ts"],
	format: "esm",
	platform: "neutral",
	bundle: true,
	minify: true,
} satisfies BuildOptions;

const revision = await execa("git", ["rev-parse", "--short", "HEAD"]).then((p) => p.stdout);

const commonDefines = {
	VENDFLARE_REVISION: JSON.stringify(revision),
	VENDFLARE_KV_ONLY: "false",
	VENDFLARE_DO_ONLY: "false",
} as const;

console.log(bold(`vendflare@${revision}`));

const tablePadding = [18, 22] as const;

const logBuild = async (name: string, file: string, color: (arg0: string) => string) => {
	name = `${name} build`;

	const sizeString = await size(join("dist", file));

	const firstPad = tablePadding[0] - name.length;
	const secondPad = tablePadding[1] - (file.length + 5);

	console.log(
		color(name) + " ".repeat(firstPad + 2) + dim("dist/") + file + " ".repeat(secondPad + 2) + color(sizeString)
	);
};

await build({
	...commonOptions,
	outfile: "dist/worker.js",
	define: {
		...commonDefines,
	},
});

await logBuild("Full", "worker.js", cyan);

await build({
	...commonOptions,
	entryPoints: ["src/worker.kv.ts"],
	outfile: "dist/worker.kv.js",
	define: {
		...commonDefines,
		VENDFLARE_KV_ONLY: "true",
	},
});

await logBuild("KV-only", "worker.kv.js", magenta);

await build({
	...commonOptions,
	outfile: "dist/worker.do.js",
	define: {
		...commonDefines,
		VENDFLARE_DO_ONLY: "true",
	},
});

await logBuild("DO-only", "worker.do.js", green);

const tinyAlias = { "hono/cors": "hono/cors", hono: "hono/tiny" } as const;

await build({
	...commonOptions,
	outfile: "dist/worker.tiny.js",
	define: {
		...commonDefines,
	},
	alias: tinyAlias,
});

await logBuild("Tiny", "worker.tiny.js", red);

await build({
	...commonOptions,
	entryPoints: ["src/worker.kv.ts"],
	outfile: "dist/worker.kv.tiny.js",
	define: {
		...commonDefines,
		VENDFLARE_KV_ONLY: "true",
	},
	alias: tinyAlias,
});

await logBuild("Tiny KV-only", "worker.kv.tiny.js", yellow);

await build({
	...commonOptions,
	outfile: "dist/worker.do.tiny.js",
	define: {
		...commonDefines,
		VENDFLARE_DO_ONLY: "true",
	},
	alias: tinyAlias,
});

await logBuild("Tiny DO-only", "worker.do.tiny.js", blue);
