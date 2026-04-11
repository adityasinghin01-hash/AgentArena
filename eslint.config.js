// eslint.config.js
// ESLint flat config for Adv_Backend Node.js project (ESLint v10+).

const globals = require('globals');

module.exports = [
  // Ignore browser-env directories — they have their own ESLint setups
  {
    ignores: ['frontend/**', 'frontend-next/**'],
  },
  {
    ignores: ['frontend/**', 'frontend-next/**'],
  },
  {
    languageOptions: {
      ecmaVersion: 2021,
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-console': 'warn',
      'no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
      }],
      'no-process-exit': 'off',
      'no-undef': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'all'],
    },
  },
  {
    files: ['**/*.test.js', '**/*.spec.js', '**/tests/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },
];
