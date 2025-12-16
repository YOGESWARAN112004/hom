import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  // In production build, __dirname points to dist/, so public is at dist/public
  const distPath = path.resolve(__dirname, "public");
  
  if (!fs.existsSync(distPath)) {
    console.error(`[ERROR] Could not find the build directory: ${distPath}`);
    console.error(`[ERROR] Current __dirname: ${__dirname}`);
    console.error(`[ERROR] Make sure to run 'npm run build' before starting the server`);
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
