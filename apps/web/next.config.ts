import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  poweredByHeader: false,
  outputFileTracingIncludes: {"/api/v1/*": ["./assets/voice/kore-showcase.wav"]},
  turbopack: { root: path.resolve(process.cwd(), "../..") },
};

export default nextConfig;

