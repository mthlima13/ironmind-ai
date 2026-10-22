const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/**', '.expo/**', 'node_modules/**', 'coverage/**'],
  },
  {
    // Node scripts run outside of the React Native runtime.
    files: ['scripts/**/*.mjs', '*.config.js', 'jest.setup.ts'],
    languageOptions: {
      globals: {
        Buffer: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        require: 'readonly',
        module: 'writable',
        jest: 'readonly',
      },
    },
  },
  {
    rules: {
      'import/order': 'off',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
]);
