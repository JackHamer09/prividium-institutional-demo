// @ts-check
import withNuxt from "./.nuxt/eslint.config.mjs";

export default withNuxt(
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    rules: {
      // Code style
      "semi": ["error", "always"],
      "quotes": ["error", "double"],
      "comma-dangle": ["error", "always-multiline"],
      "comma-spacing": ["error", { "before": false, "after": true }],
      "object-curly-spacing": ["error", "always"],
      "array-bracket-spacing": ["error", "never"],
      "space-before-function-paren": ["error", {
        "anonymous": "always",
        "named": "never",
        "asyncArrow": "always",
      }],

      // Best practices
      "no-console": ["warn", { "allow": ["warn", "error"] }],
      "no-debugger": "warn",
      "no-unused-vars": "off",
      "prefer-const": "error",
      "no-var": "error",
      "eqeqeq": ["error", "always"],
      "curly": ["error", "all"],

      // Import ordering
      "sort-imports": ["error", {
        "ignoreCase": true,
        "ignoreDeclarationSort": true,
      }],
    },
  },
  {
    files: ["**/*.vue"],
    rules: {
      // Code style for Vue
      "semi": ["error", "always"],
      "quotes": ["error", "double"],
      "comma-dangle": ["error", "always-multiline"],

      // Vue specific
      "vue/multi-word-component-names": "off",
      "vue/require-default-prop": "off",
      "vue/html-self-closing": ["error", {
        "html": {
          "void": "always",
          "normal": "always",
          "component": "always",
        },
      }],
      "vue/max-attributes-per-line": ["error", {
        "singleline": 3,
        "multiline": 1,
      }],
    },
  },
  {
    ignores: [
      ".nuxt",
      "dist",
      "node_modules",
      ".output",
      "*.config.*",
      "contracts",
    ],
  },
);
