import type { NextConfig } from "next";

// Validates process.env against src/env.ts at build/start time (T3-style),
// so a missing/invalid NEXT_PUBLIC_API_URL fails fast instead of surfacing
// as a runtime fetch error.
import "./src/env";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ["10.0.0.15"],
};

export default nextConfig;
