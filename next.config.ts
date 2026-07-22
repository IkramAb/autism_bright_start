import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Logo uploads go through a Server Action; the default 1MB body cap would
    // reject files up to our 2MB logo limit, so allow some headroom.
    serverActions: {
      bodySizeLimit: "3mb",
    },
  },
};

export default nextConfig;
