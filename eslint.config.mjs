import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

const config = [
  ...nextVitals,
  ...nextTypescript,
  prettier,
  {
    ignores: ["node_modules/**", ".next/**", "coverage/**", "supabase/.temp/**"]
  }
];

export default config;
