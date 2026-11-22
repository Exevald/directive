import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["node_modules/**", "directive-ai/dist/**"] },
  {
    files: ["**/*.{js,mjs,ts}"],
    extends: [js.configs.recommended],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      eqeqeq: ["error", "always"],
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-var": "error",
    },
  },
  {
    files: ["starter/**/*.js"],
    languageOptions: {
      globals: {
        canvas: "readonly",
        ctx: "readonly",
        editor: "readonly",
        pencil: "readonly",
        marker: "readonly",
        spray: "readonly",
        eraser: "readonly",
        myBrush: "readonly",
        selectBrush: "readonly",
      },
    },
    rules: { "no-unused-vars": "off" },
  },
  {
    files: ["directive-ai/**/*.ts"],
    extends: [tseslint.configs.strict],
  },
  prettier,
);
