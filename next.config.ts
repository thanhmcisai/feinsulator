import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb", // Tăng giới hạn lên 10MB (hoặc tuỳ chỉnh)
    },
  },
};

export default nextConfig;
