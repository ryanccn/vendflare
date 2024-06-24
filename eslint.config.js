import { config } from '@ryanccn/eslint-config';

export default config({
	ignores: ['**/dist', '**/.wrangler', '**/test/coverage'],
	stylistic: true,
	rules: {
		'unicorn/import-style': 'off',
	},
});
