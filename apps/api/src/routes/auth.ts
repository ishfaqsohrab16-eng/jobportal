import crypto from "node:crypto";
import { Router } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "@digibizz/jobs-shared";
import { config } from "../config";
import { currentUser, endSession, requireAuth, startSession } from "../lib/auth";
import { badRequest, body, conflict, HttpError } from "../lib/http";
import { UserModel } from "../models";
import { toUserDTO } from "../serializers";
import { sendPasswordChangedEmail, sendPasswordResetEmail, sendWelcomeEmail } from "../services/email";

export const authRouter = Router();

const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 12);

const limiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: config.isTest ? 1_000 : 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: { code: "rate_limited", message: "Too many attempts. Try again in a few minutes." } },
});

authRouter.post("/register", limiter, async (req, res) => {
  const input = body(req, registerSchema);
  if (await UserModel.exists({ email: input.email })) {
    throw conflict("An account with this email already exists. Try signing in.");
  }
  const user = await UserModel.create({
    name: input.name,
    email: input.email,
    phone: input.phone,
    passwordHash: await bcrypt.hash(input.password, 12),
    role: "candidate",
    lastLoginAt: new Date(),
  });
  startSession(res, user);
  void sendWelcomeEmail(user);
  res.status(201).json({ user: toUserDTO(user) });
});

authRouter.post("/login", limiter, async (req, res) => {
  const input = body(req, loginSchema);
  const user = await UserModel.findOne({ email: input.email }).select("+passwordHash");
  // Compare against a dummy hash when the user is unknown so timing does not reveal which emails exist.
  const ok = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) throw new HttpError(401, "invalid_credentials", "Email or password is incorrect");
  user.lastLoginAt = new Date();
  await user.save();
  startSession(res, user);
  res.json({ user: toUserDTO(user) });
});

authRouter.post("/logout", (_req, res) => {
  endSession(res);
  res.status(204).end();
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ user: toUserDTO(currentUser(req)) });
});

authRouter.post("/password", requireAuth, async (req, res) => {
  const input = body(req, changePasswordSchema);
  const user = await UserModel.findById(currentUser(req).id).select("+passwordHash");
  if (!user || !(await bcrypt.compare(input.currentPassword, user.passwordHash))) {
    throw badRequest("Current password is incorrect", { currentPassword: "Current password is incorrect" });
  }
  user.passwordHash = await bcrypt.hash(input.newPassword, 12);
  // A password change invalidates any outstanding reset link.
  user.set({ resetTokenHash: null, resetTokenExpiresAt: null });
  await user.save();
  void sendPasswordChangedEmail(user);
  res.status(204).end();
});

/* -------------------------------------------------------- password reset */

const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

// Stricter than the general auth limiter: this endpoint sends email.
const resetLimiter = rateLimit({
  windowMs: 60 * 60_000,
  limit: config.isTest ? 1_000 : 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: { code: "rate_limited", message: "Too many reset requests. Try again later." } },
});

authRouter.post("/forgot-password", resetLimiter, async (req, res) => {
  const { email } = body(req, forgotPasswordSchema);
  const user = await UserModel.findOne({ email });
  if (user) {
    const token = crypto.randomBytes(32).toString("base64url");
    user.set({
      resetTokenHash: hashToken(token),
      resetTokenExpiresAt: new Date(Date.now() + config.RESET_TOKEN_TTL_MINUTES * 60_000),
    });
    await user.save();
    await sendPasswordResetEmail(user, token, config.RESET_TOKEN_TTL_MINUTES);
  }
  // Always the same answer, so this cannot be used to discover which emails have accounts.
  res.status(202).json({ message: "If that email has an account, a reset link is on its way." });
});

authRouter.post("/reset-password", resetLimiter, async (req, res) => {
  const input = body(req, resetPasswordSchema);
  const user = await UserModel.findOne({
    resetTokenHash: hashToken(input.token),
    resetTokenExpiresAt: { $gt: new Date() },
  }).select("+resetTokenHash +resetTokenExpiresAt");
  if (!user) {
    throw badRequest("This reset link has expired or already been used. Request a new one.", { token: "Invalid or expired link" });
  }
  user.passwordHash = await bcrypt.hash(input.password, 12);
  user.set({ resetTokenHash: null, resetTokenExpiresAt: null });
  await user.save();
  void sendPasswordChangedEmail(user, { reset: true });
  startSession(res, user);
  res.json({ user: toUserDTO(user) });
});
