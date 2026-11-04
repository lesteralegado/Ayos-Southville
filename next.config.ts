import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    agentUpgrade: "security",
  },
  distDir: process.env.NEXT_PUBLIC_FIREBASE_EMULATORS === "true" ? ".next-local" : ".next",
};

export default nextConfig;
