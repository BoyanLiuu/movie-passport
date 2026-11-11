import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";
import preferArrowFunctions from "eslint-plugin-prefer-arrow-functions";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  // Same modern-syntax rules as the sibling projects: arrow functions, no `var`, template strings.
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,tsx}"],
    plugins: { "prefer-arrow-functions": preferArrowFunctions },
    rules: {
      "prefer-arrow-functions/prefer-arrow-functions": [
        "error",
        { allowObjectProperties: true, returnStyle: "unchanged" },
      ],
      "prefer-arrow-callback": "error",
      "no-var": "error",
      "prefer-const": "error",
      "object-shorthand": "error",
      "prefer-template": "error",
    },
  },
  // Next.js route files keep the framework's `export default function Page()` convention.
  {
    files: ["src/app/**/{page,layout,not-found,error,loading,template,default,route}.{ts,tsx}"],
    rules: { "prefer-arrow-functions/prefer-arrow-functions": "off" },
  },
  globalIgnores([
    ".next/**",
    ".next-e2e/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
