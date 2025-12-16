import { build as viteBuild } from "vite";
import { rm } from "fs/promises";

async function buildClient() {
  // Only remove public directory, keep server build if it exists
  await rm("dist/public", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();
  console.log("Client build complete!");
}

buildClient().catch((err) => {
  console.error(err);
  process.exit(1);
});

