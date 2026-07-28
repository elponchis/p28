// https://docs.expo.dev/guides/using-eslint/
// Flat config: ESLint + Expo + Prettier (SDK 53+)
const { defineConfig } = require('eslint/config');
const globals = require('globals');
const expoConfig = require('eslint-config-expo/flat');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');
const eslintConfigPrettier = require('eslint-config-prettier/flat');

module.exports = defineConfig([
  expoConfig,
  eslintPluginPrettierRecommended,
  eslintConfigPrettier,
  {
    files: ['**/__tests__/**/*.{ts,tsx,js,jsx}', '**/*.test.{ts,tsx,js,jsx}'],
    languageOptions: {
      globals: { ...globals.jest, require: 'readonly', module: 'readonly' },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    rules: {
      'react/no-unescaped-entities': 'off',
    },
  },
  {
    ignores: ['dist/*', '.expo/*', 'node_modules/**', '**/*.d.ts', '_bmad/**', '_bmad-output/**'],
  },
]);
