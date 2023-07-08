import { defineConfig } from "vitest/config";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

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
