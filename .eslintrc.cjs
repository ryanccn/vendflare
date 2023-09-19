/* eslint-env node */
/* eslint-disable unicorn/no-empty-file */

module.exports = {
	extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "plugin:unicorn/recommended"],
	parser: "@typescript-eslint/parser",
	plugins: ["@typescript-eslint"],
	root: true,
	rules: {
		"@typescript-eslint/no-non-null-assertion": "off",
		"no-unused-labels": "off",
		"unicorn/prevent-abbreviations": "off",
		"unicorn/no-null": "off",
		"unicorn/filename-case": ["warn", { case: "camelCase" }],
		"unicorn/no-nested-ternary": "off",
		"unicorn/consistent-function-scoping": "off",
	},
};
