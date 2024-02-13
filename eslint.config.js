import js from "@eslint/js";
import ts from "typescript-eslint";
import unicorn from "eslint-plugin-unicorn";

import globals from "globals";

export default ts.config(
	{
		ignores: ["dist/**", ".wrangler/**", "test/coverage/**"],
	},

	js.configs.recommended,
	...ts.configs.recommendedTypeChecked,
	unicorn.configs["flat/recommended"],

	{
		languageOptions: {
			parserOptions: {
				project: true,
				tsconfigRootDir: import.meta.dirname,
			},
			globals: {
				...globals.browser,
			},
		},
	},

	{
		rules: {
			"no-unused-labels": "off",
			"@typescript-eslint/restrict-template-expressions": "off",
			"unicorn/prevent-abbreviations": "off",
			"unicorn/no-null": "off",
			"unicorn/filename-case": "off",
			"unicorn/no-nested-ternary": "off",
			"unicorn/consistent-function-scoping": "off",
		},
	},

	{
		files: ["**/*.js"],
		...ts.configs.disableTypeChecked,
	},
);
