/* eslint-env node */

import { build } from "esbuild";

import { bold, cyan, dim, green, magenta } from "kleur/colors";
import { execa } from "execa";

import { readFile } from "node:fs/promises";

/**
 * https://stackoverflow.com/a/14919494
 *
 * @param {string} f
 */
const size = async (f) => {
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

/** @type {import('esbuild').BuildOptions} */
const sharedOptions = {
	entryPoints: ["src/worker.ts"],
	format: "esm",
	platform: "neutral",
	bundle: true,
	minify: true,
};

const revision = await execa("git", ["rev-parse", "--short", "HEAD"]).then((p) => p.stdout);

console.log(bold(`vendflare@${revision}`));

await build({
	...sharedOptions,
	outfile: "dist/worker.js",
	define: {
		VENDFLARE_KV_ONLY: "false",
		VENDFLARE_DO_ONLY: "false",
		VENDFLARE_REVISION: JSON.stringify(revision),
	},
});

console.log(`${cyan("Full build")}          ${dim("dist/")}worker.js          ${cyan(await size("dist/worker.js"))}`);

await build({
	...sharedOptions,
	entryPoints: ["src/worker.kv.ts"],
	outfile: "dist/worker.kv.js",
	define: {
		VENDFLARE_KV_ONLY: "true",
		VENDFLARE_DO_ONLY: "false",
		VENDFLARE_REVISION: JSON.stringify(revision),
	},
});

console.log(
	`${magenta("KV-only build")}       ${dim("dist/")}worker.kv.js       ${magenta(await size("dist/worker.kv.js"))}`
);

await build({
	...sharedOptions,
	outfile: "dist/worker.do.js",
	define: {
		VENDFLARE_KV_ONLY: "false",
		VENDFLARE_DO_ONLY: "true",
		VENDFLARE_REVISION: JSON.stringify(revision),
	},
});

console.log(
	`${green("DO-only build")}       ${dim("dist/")}worker.do.js       ${green(await size("dist/worker.do.js"))}`
);

await build({
	...sharedOptions,
	outfile: "dist/worker.tiny.js",
	define: {
		VENDFLARE_KV_ONLY: "false",
		VENDFLARE_DO_ONLY: "false",
		VENDFLARE_REVISION: JSON.stringify(revision),
	},
	alias: { "hono/cors": "hono/cors", hono: "hono/tiny" },
});

console.log(
	`${cyan("Tiny build")}          ${dim("dist/")}worker.tiny.js     ${cyan(await size("dist/worker.tiny.js"))}`
);

await build({
	...sharedOptions,
	entryPoints: ["src/worker.kv.ts"],
	outfile: "dist/worker.kv.tiny.js",
	define: {
		VENDFLARE_KV_ONLY: "true",
		VENDFLARE_DO_ONLY: "false",
		VENDFLARE_REVISION: JSON.stringify(revision),
	},
	alias: { "hono/cors": "hono/cors", hono: "hono/tiny" },
});

console.log(
	`${magenta("KV-only tiny build")}  ${dim("dist/")}worker.kv.tiny.js  ${magenta(await size("dist/worker.kv.tiny.js"))}`
);

await build({
	...sharedOptions,
	outfile: "dist/worker.do.tiny.js",
	define: {
		VENDFLARE_KV_ONLY: "false",
		VENDFLARE_DO_ONLY: "true",
		VENDFLARE_REVISION: JSON.stringify(revision),
	},
	alias: { "hono/cors": "hono/cors", hono: "hono/tiny" },
});

console.log(
	`${green("DO-only tiny build")}  ${dim("dist/")}worker.do.tiny.js  ${green(await size("dist/worker.do.tiny.js"))}`
);