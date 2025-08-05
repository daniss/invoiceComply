import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  output: 'standalone',
  generateBuildId: async () => {
    return 'build-id-' + Date.now()
  },
  serverExternalPackages: ['pdf-parse'],
};

export default nextConfig;
