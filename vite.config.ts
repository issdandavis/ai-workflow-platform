/**
 * Vite Configuration
 *
 * Minimal config for development server.
 * A full frontend needs to be built to use this properly.
 */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  root: "./client",
  build: {
    outDir: "../dist/public",
    emptyOutDir: true,
  },
  server: {
    port: 5000,
  },
});
