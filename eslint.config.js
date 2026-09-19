import { config } from '@ryanccn/eslint-config';

export default config({
	ignores: ['**/dist', '**/.wrangler', '**/coverage', 'src/worker-configuration.d.ts'],
	stylistic: true,
	rules: {
		'unicorn/no-top-level-side-effects': 'off',
		'unicorn/max-nested-calls': 'off',
		'unicorn/no-non-function-verb-prefix': 'off',
	},
});
