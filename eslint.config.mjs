import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "dist/**",
    ".tmp/**",
    ".tmp-smoke/**",
    ".wrangler/**",
    "artifacts/**",
    "outputs/**",
    "next-env.d.ts",
    // Legacy prototype retained for reference; the complete product now uses rehab-system.tsx.
    "app/ankle-guided-workflow.tsx",
  ]),
]);

export default eslintConfig;
