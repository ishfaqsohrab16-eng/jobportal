import bcrypt from "bcryptjs";
import { config } from "../config";
import { UserModel } from "../models";

/**
 * Create the first admin from ADMIN_EMAIL / ADMIN_PASSWORD if no admin exists.
 * Existing admins are never modified, so changing the env later has no effect.
 */
export async function ensureAdmin(): Promise<void> {
  if (await UserModel.exists({ role: "admin" })) return;
  if (!config.ADMIN_EMAIL || !config.ADMIN_PASSWORD) {
    console.warn("No admin account exists. Set ADMIN_EMAIL and ADMIN_PASSWORD to create one on startup.");
    return;
  }
  const email = config.ADMIN_EMAIL.toLowerCase();
  const existing = await UserModel.findOne({ email });
  if (existing) {
    existing.role = "admin";
    await existing.save();
  } else {
    await UserModel.create({
      name: config.ADMIN_NAME,
      email,
      role: "admin",
      passwordHash: await bcrypt.hash(config.ADMIN_PASSWORD, 12),
    });
  }
  console.log(`Admin account ready: ${email}`);
}
