import nextVitals from "eslint-config-next/core-web-vitals"

const config = [
  ...nextVitals,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "examples/**",
      "processor/**",
      "supabase/**",
      "tests/fixtures/**",
    ],
  },
]

export default config
