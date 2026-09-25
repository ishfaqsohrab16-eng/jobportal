import { Router } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { changePasswordSchema, loginSchema, registerSchema } from "@digibizz/jobs-shared";
import { config } from "../config";
import { currentUser, endSession, requireAuth, startSession } from "../lib/auth";
import { badRequest, body, conflict, HttpError } from "../lib/http";
import { UserModel } from "../models";
import { toUserDTO } from "../serializers";

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
  await user.save();
  res.status(204).end();
});
