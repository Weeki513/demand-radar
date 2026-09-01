import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["@solarisdk/browser", "patchright-core", "fsevents"],
  outputFileTracingIncludes: {
    "/api/internal/worker": [
      "./processor/pipeline.py",
      "./node_modules/patchright-core/**/*",
    ],
    "/api/products/analyze": ["./node_modules/patchright-core/**/*"],
  },
}

export default nextConfig
