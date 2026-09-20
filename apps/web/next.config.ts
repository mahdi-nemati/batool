import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@batool/types"],
  output: "standalone",
  // Keep `next dev` artifacts separate from `next build` so a production build
  // cannot invalidate the running development server's webpack chunks.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
};

export default nextConfig;
