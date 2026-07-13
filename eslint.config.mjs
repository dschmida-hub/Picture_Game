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
    ".codex/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Claude Code's own skill tooling, not part of this app - its .cjs
    // scripts are intentionally CommonJS and aren't meant to follow this
    // project's lint rules.
    ".claude/**",
  ]),
]);

export default eslintConfig;
