/* eslint-env node */

import { BuildOptions, build } from "esbuild";

import { bold, dim, cyan, green, magenta } from "kleur/colors";
import { execa } from "execa";

import { readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

try {
	for (const f of await readdir("dist")) {
		await rm(join("dist", f));
	}
} catch (error: unknown) {
	if (!(error instanceof Error && typeof error.message.includes("ENOENT"))) {
		throw error;
	}
}

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
	format: "esm",
	platform: "neutral",
	bundle: true,
	minify: true,
} satisfies BuildOptions;

const revision = await execa("git", ["rev-parse", "--short", "HEAD"]).then((p) => p.stdout);

const commonDefines = {
	VENDFLARE_REVISION: JSON.stringify(revision),
	VENDFLARE_SINGLE_BACKEND: JSON.stringify(null),
} as const;

const tinyAlias = { "hono/cors": "hono/cors", "hono/timing": "hono/timing", hono: "hono/tiny" } as const;

console.log(bold(`vendflare@${revision}`));

const columnWidth = 30;
const logBuild = async (name: string, file: string, color: (arg0: string) => string) => {
	name = `${name} build`;

	const sizeString = await size(join("dist", file));

	const firstPad = columnWidth - name.length;
	const secondPad = columnWidth - (file.length + 5);

	console.log(
		color(name) + " ".repeat(firstPad + 2) + dim("dist/") + file + " ".repeat(secondPad + 2) + color(sizeString),
	);
};

const workerDeclaration = `
import worker from '../src/worker';
export default worker;
`.trimStart();

const durableDeclaration = `
export { UserData } from '../src/worker';
`.trimStart();

for (const preset of ["default", "tiny"] as const) {
	for (const backend of ["all", "kv", "do"] as const) {
		const outfile = `worker${backend === "all" ? "" : `.${backend}`}${preset === "tiny" ? ".tiny" : ""}.js`;

		await build({
			...commonOptions,
			entryPoints: backend === "kv" ? ["src/worker.kv.ts"] : ["src/worker.ts"],
			outfile: join("dist", outfile),
			define: {
				...commonDefines,
			},
			dropLabels: backend === "kv" ? ["durable"] : backend === "do" ? ["kv"] : [],
			alias: preset === "tiny" ? tinyAlias : undefined,
		});

		await writeFile(
			join("dist", outfile.replace(/\.js$/, ".d.ts")),
			workerDeclaration + (backend === "kv" ? "" : durableDeclaration),
		);

		await logBuild(`${preset} ${backend}`, outfile, backend === "all" ? cyan : backend === "do" ? green : magenta);
	}
}
