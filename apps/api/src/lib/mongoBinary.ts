import fs from "node:fs";
import path from "node:path";

/**
 * mongodb-memory-server looks for its mongod binary relative to the current
 * package, so apps/api and the repo root would each download their own ~600 MB
 * copy. Point every run at one cache in the workspace root instead.
 */
export function useSharedMongoBinaryCache() {
  if (process.env.MONGOMS_DOWNLOAD_DIR) return;
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    const pkg = path.join(dir, "package.json");
    if (fs.existsSync(pkg) && "workspaces" in JSON.parse(fs.readFileSync(pkg, "utf8"))) {
      process.env.MONGOMS_DOWNLOAD_DIR = path.join(dir, "node_modules", ".cache", "mongodb-memory-server");
      return;
    }
    const parent = path.dirname(dir);
    if (parent === dir) return;
    dir = parent;
  }
}
