import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  serverExternalPackages: [
    "remotion", 
    "@remotion/player",
    "@remotion/renderer",
    "@remotion/bundler"
  ],
};

export default nextConfig;
