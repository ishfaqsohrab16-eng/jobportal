import { defineConfig } from "tsup";

export default defineConfig({
  entry: { index: "src/index.ts", seed: "src/scripts/seed.ts" },
  format: ["esm"],
  platform: "node",
  target: "node20",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  // The shared workspace package is TypeScript source, so it is bundled in;
  // every real npm dependency stays external and comes from node_modules.
  noExternal: ["@digibizz/jobs-shared"],
  external: ["mongodb-memory-server"],
});
