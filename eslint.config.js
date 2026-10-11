import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "node_modules", "tools/out"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      globals: { ...globals.browser },
    },
    rules: {
      quotes: ["error", "double", { avoidEscape: true }],
      semi: ["error", "always"],
    },
  },
  {
    files: ["tools/**/*.mjs", "*.js"],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      quotes: ["error", "double", { avoidEscape: true }],
      semi: ["error", "always"],
    },
  },
);
