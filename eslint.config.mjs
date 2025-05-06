import globals from "globals";

export default [
  {
    files: ["**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.mocha,
      },
      parserOptions: {
        project: "./tsconfig.json",
        ecmaVersion: 2022,
        sourceType: "module",
      },
    },
    rules: {
      "@typescript-eslint/explicit-function-return-type": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "no-const-assign": "error",
      "no-this-before-super": "error",
      "no-unreachable": "warn",
      "constructor-super": "error",
      "valid-typeof": "error",
    },
  },
  {
    files: ["**/*.js", "**/*.mjs"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.mocha,
      },
      ecmaVersion: 2022,
      sourceType: "module",
    },
    rules: {
      "no-const-assign": "error",
      "no-this-before-super": "error",
      "no-undef": "warn",
      "no-unreachable": "warn",
      "no-unused-vars": "warn",
      "constructor-super": "error",
      "valid-typeof": "error",
    },
  },
];