import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const projectRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	test: {
		root: "./test",
		environment: "miniflare",
		alias: {
			"@src": join(projectRoot, "src"),
			"@dist": join(projectRoot, "dist"),
		},
	},
});
