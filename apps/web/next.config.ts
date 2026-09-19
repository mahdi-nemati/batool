import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@batool/types"],
  output: "standalone",
};

export default nextConfig;
