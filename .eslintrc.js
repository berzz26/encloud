module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  rules: {
    'no-const-assign': 'error',
    'no-this-before-super': 'error',
    'no-unreachable': 'warn',
    'constructor-super': 'error',
    'valid-typeof': 'error'
  },
  ignorePatterns: [
    'dist',
    'node_modules',
    '**/*.d.ts',
    'test'
  ]
};
