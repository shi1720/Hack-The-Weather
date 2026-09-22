import js from '@eslint/js';
import ts from 'typescript-eslint';
export default ts.config(
  {
    ignores: [
      'dist/**',
      'build/**',
      'node_modules/**',
      'output/**',
      'public/**',
      'data/**',
      'scripts/*.mjs',
      'playwright-report/**',
      'test-results/**',
      'coverage/**',
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
);
