/**
 * npm run seed   -> make sure the admin from ADMIN_EMAIL/ADMIN_PASSWORD exists.
 *
 * Opportunities are created by DigiBizz admins in the dashboard; no demo data is loaded.
 */
import { connectDb, disconnectDb } from "../db";
import { ensureAdmin } from "../services/bootstrap";

async function main() {
  await connectDb();
  await ensureAdmin();
  if (process.argv.includes("--demo")) {
    console.log("Demo seeding is disabled. This project keeps only the admin account in the database.");
  }
  await disconnectDb();
}

main().catch(async (err) => {
  console.error(err);
  await disconnectDb().catch(() => undefined);
  process.exit(1);
});
