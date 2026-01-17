import js from '@eslint/js';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import svelteParser from 'svelte-eslint-parser';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

/** @type {import('eslint').Linter.Config[]} */
export default [
	// Ignore patterns
	{
		ignores: [
			'**/node_modules/**',
			'**/.vite/**',
			'**/build/**',
			'**/dist/**',
			'**/.svelte-kit/**',
			'**/coverage/**',
			'**/test-results/**',
			'**/playwright-report/**',
			'**/*.min.js',
			'**/*.min.mjs',
			'**/static/**/*.mjs',
		],
	},

	// Base JS config
	js.configs.recommended,

	// TypeScript config
	...ts.configs.recommended,

	// Svelte config
	...svelte.configs['flat/recommended'],

	// Svelte + TypeScript parser config
	{
		files: ['**/*.svelte'],
		languageOptions: {
			parser: svelteParser,
			parserOptions: {
				parser: ts.parser,
			},
		},
	},

	// Global settings for all files
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
			},
		},
		rules: {
			'no-console': ['warn', { allow: ['warn', 'error'] }],
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
				},
			],
			'@typescript-eslint/no-explicit-any': 'warn',
		},
	},

	// Svelte-specific rules
	{
		files: ['**/*.svelte'],
		rules: {
			// Allow $state, $derived, etc. runes
			'svelte/valid-compile': 'off',
			// Allow unused svelte-ignore comments (may be needed for different svelte versions)
			'svelte/no-unused-svelte-ignore': 'off',
			// These are handled by svelte-check
			'@typescript-eslint/no-unused-vars': 'off',
			// Allow bare variable references in $effect blocks (Svelte 5 runes pattern)
			'@typescript-eslint/no-unused-expressions': 'off',
		},
	},

	// Prettier config (must be last to override other formatting rules)
	prettier,
];
