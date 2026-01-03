/**
 * Static File Server v2.0
 * 
 * Serves the built React application in production mode.
 * Falls back to index.html for client-side routing.
 * 
 * @version 2.0.0
 * @environment Production only
 */

import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  
  if (!fs.existsSync(distPath)) {
    console.error(`Build directory not found: ${distPath}`);
    console.error("Run 'npm run build' to create the production build.");
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  console.log(`Serving static files from: ${distPath}`);
  
  // Serve static files with caching headers
  app.use(express.static(distPath, {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
    etag: true,
  }));

  // Fall through to index.html for SPA routing
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
