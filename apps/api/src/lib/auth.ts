import type { CookieOptions, Request, RequestHandler, Response } from "express";
import jwt from "jsonwebtoken";
import type { UserRole } from "@digibizz/jobs-shared";
import { config } from "../config";
import { UserModel, type UserDoc } from "../models";
import { forbidden, unauthorized } from "./http";

export const SESSION_COOKIE = "dbj_session";

declare module "express-serve-static-core" {
  interface Request {
    user?: UserDoc;
  }
}

interface SessionClaims {
  sub: string;
  role: UserRole;
}

const cookieOptions = (): CookieOptions => ({
  httpOnly: true,
  sameSite: "lax",
  secure: config.cookieSecure,
  path: "/",
  maxAge: config.JWT_TTL_DAYS * 86_400_000,
});

export function startSession(res: Response, user: UserDoc) {
  const claims: SessionClaims = { sub: user.id, role: user.role };
  const token = jwt.sign(claims, config.JWT_SECRET, { expiresIn: `${config.JWT_TTL_DAYS}d` });
  res.cookie(SESSION_COOKIE, token, cookieOptions());
}

export function endSession(res: Response) {
  const { maxAge: _ignored, ...opts } = cookieOptions();
  res.clearCookie(SESSION_COOKIE, opts);
}

async function userFromRequest(req: Request): Promise<UserDoc | null> {
  const token: unknown = req.cookies?.[SESSION_COOKIE];
  if (typeof token !== "string" || !token) return null;
  try {
    const claims = jwt.verify(token, config.JWT_SECRET) as SessionClaims;
    return await UserModel.findById(claims.sub);
  } catch {
    return null;
  }
}

/** Attaches req.user when a valid session exists; never rejects. */
export const optionalAuth: RequestHandler = async (req, _res, next) => {
  req.user = (await userFromRequest(req)) ?? undefined;
  next();
};

export const requireAuth: RequestHandler = async (req, res, next) => {
  const user = await userFromRequest(req);
  if (!user) {
    endSession(res);
    throw unauthorized();
  }
  req.user = user;
  next();
};

export const requireRole =
  (...roles: UserRole[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) throw forbidden();
    next();
  };

/** Narrow req.user after requireAuth has run. */
export function currentUser(req: Request): UserDoc {
  if (!req.user) throw unauthorized();
  return req.user;
}
