import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_PUBLIC_FIREBASE_EMULATORS === "true" ? ".next-local" : ".next",
};

export default nextConfig;
