import { readFileSync } from "node:fs";
import type { NextConfig } from "next";

const packageJson = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8"),
) as { version: string };

const nextConfig: NextConfig = {
  output: "export",
  env: {
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
  },
};

export default nextConfig;
