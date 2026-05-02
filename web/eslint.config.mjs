import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Repo uses loose Supabase rows and gradual typing; warnings keep CI readable without blocking deploy.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
];

export default eslintConfig;
