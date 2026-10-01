import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import { MongoMemoryServer } from "mongodb-memory-server";
import type { Express } from "express";

/**
 * Password reset and the cascade delete. Email is off in tests (no BREVO_API_KEY),
 * so the reset token is read straight from the database - exactly what the link carries.
 */

let mongo: MongoMemoryServer;
let app: Express;
let admin: ReturnType<typeof request.agent>;
let candidate: ReturnType<typeof request.agent>;

const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

const opportunity = (over: Record<string, unknown> = {}) => ({
  type: "job",
  title: "Backend Engineer",
  description: "Build and run the APIs behind our products for customers in Pakistan.",
  city: "Quetta",
  country: "Pakistan",
  workMode: "onsite",
  employmentType: "full_time",
  positions: 1,
  deadline: day(10),
  status: "open",
  ...over,
});

beforeAll(async () => {
  const { useSharedMongoBinaryCache } = await import("../src/lib/mongoBinary");
  useSharedMongoBinaryCache();
  mongo = await MongoMemoryServer.create();
  process.env.UPLOAD_DIR = "./.data/test-uploads";
  const { connectDb } = await import("../src/db");
  await connectDb(mongo.getUri("reset_test"));
  const { createApp } = await import("../src/app");
  const { UserModel } = await import("../src/models");
  app = createApp();

  await UserModel.create({ name: "Admin", email: "admin@test.pk", role: "admin", passwordHash: await bcrypt.hash("Admin12345", 4) });
  admin = request.agent(app);
  await admin.post("/api/auth/login").send({ email: "admin@test.pk", password: "Admin12345" }).expect(200);

  candidate = request.agent(app);
  await candidate.post("/api/auth/register").send({ name: "Zara Baloch", email: "zara@test.pk", password: "Secret123" }).expect(201);
});

afterAll(async () => {
  const { disconnectDb } = await import("../src/db");
  await disconnectDb();
  await mongo?.stop();
});

/** The raw reset token never leaves the email, so tests mint one the same way the route does. */
async function requestResetToken(email: string) {
  const crypto = await import("node:crypto");
  const { UserModel } = await import("../src/models");
  await request(app).post("/api/auth/forgot-password").send({ email }).expect(202);
  const user = await UserModel.findOne({ email }).select("+resetTokenHash +resetTokenExpiresAt");
  // Brute-force the matching token is impossible; instead re-sign a known one.
  const token = crypto.randomBytes(32).toString("base64url");
  user!.set({ resetTokenHash: crypto.createHash("sha256").update(token).digest("hex") });
  await user!.save();
  return { token, user: user! };
}

describe("password reset", () => {
  it("answers the same way whether or not the email exists", async () => {
    const a = await request(app).post("/api/auth/forgot-password").send({ email: "zara@test.pk" }).expect(202);
    const b = await request(app).post("/api/auth/forgot-password").send({ email: "nobody@test.pk" }).expect(202);
    expect(a.body).toEqual(b.body);
    expect(JSON.stringify(a.body)).not.toMatch(/token/i);
  });

  it("stores only a hash of the token, never the token itself", async () => {
    const { UserModel } = await import("../src/models");
    await request(app).post("/api/auth/forgot-password").send({ email: "zara@test.pk" }).expect(202);
    const raw = await UserModel.findOne({ email: "zara@test.pk" }).select("+resetTokenHash +resetTokenExpiresAt").lean();
    expect(raw!.resetTokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(raw!.resetTokenExpiresAt!.getTime()).toBeGreaterThan(Date.now());

    // The hash is hidden from normal reads, so it cannot leak through a serializer.
    const hidden = await UserModel.findOne({ email: "zara@test.pk" }).lean();
    expect(hidden).not.toHaveProperty("resetTokenHash");
  });

  it("rejects a wrong token and accepts a valid one exactly once", async () => {
    await request(app).post("/api/auth/reset-password").send({ token: "x".repeat(32), password: "BrandNew123" }).expect(400);

    const { token } = await requestResetToken("zara@test.pk");
    const res = await request(app).post("/api/auth/reset-password").send({ token, password: "BrandNew123" }).expect(200);
    expect(res.body.user.email).toBe("zara@test.pk");
    expect(res.headers["set-cookie"]?.[0]).toMatch(/HttpOnly/);

    // Reusing the same link now fails, and the new password works.
    await request(app).post("/api/auth/reset-password").send({ token, password: "Another123" }).expect(400);
    await request(app).post("/api/auth/login").send({ email: "zara@test.pk", password: "BrandNew123" }).expect(200);
    await request(app).post("/api/auth/login").send({ email: "zara@test.pk", password: "Secret123" }).expect(401);
  });

  it("refuses an expired token and weak passwords", async () => {
    const { token, user } = await requestResetToken("zara@test.pk");
    user.set({ resetTokenExpiresAt: new Date(Date.now() - 1000) });
    await user.save();
    await request(app).post("/api/auth/reset-password").send({ token, password: "Valid12345" }).expect(400);

    const { token: fresh } = await requestResetToken("zara@test.pk");
    const weak = await request(app).post("/api/auth/reset-password").send({ token: fresh, password: "short" }).expect(400);
    expect(weak.body.error.fields.password).toBeTruthy();
  });

  it("clears any outstanding reset link when the password is changed normally", async () => {
    const { UserModel } = await import("../src/models");
    await requestResetToken("zara@test.pk");
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: "zara@test.pk", password: "BrandNew123" }).expect(200);
    await agent.post("/api/auth/password").send({ currentPassword: "BrandNew123", newPassword: "Changed12345" }).expect(204);

    const raw = await UserModel.findOne({ email: "zara@test.pk" }).select("+resetTokenHash").lean();
    expect(raw!.resetTokenHash).toBeNull();
  });
});

describe("deleting an opportunity", () => {
  it("deletes one with no applications in a single step", async () => {
    const created = await admin.post("/api/admin/opportunities").send(opportunity({ title: "Empty Role" })).expect(201);
    const res = await admin.delete(`/api/admin/opportunities/${created.body.id}`).send({}).expect(200);
    expect(res.body).toEqual({ deletedApplications: 0 });
    await admin.get(`/api/admin/opportunities/${created.body.id}`).expect(404);
  });

  it("protects one that has applications until the admin opts in and retypes the title", async () => {
    const job = (await admin.post("/api/admin/opportunities").send(opportunity({ title: "Busy Role" })).expect(201)).body;

    const applicant = request.agent(app);
    await applicant.post("/api/auth/register").send({ name: "Ali Khan", email: "ali@test.pk", password: "Secret123" }).expect(201);
    await applicant.put("/api/me/resume").attach("resume", Buffer.from("%PDF-1.4"), { filename: "cv.pdf", contentType: "application/pdf" }).expect(200);
    await applicant.post(`/api/me/applications/${job.id}`).send({ phone: "03001234567" }).expect(201);

    // 1. No opt-in: refused, and nothing is touched.
    const blocked = await admin.delete(`/api/admin/opportunities/${job.id}`).send({}).expect(409);
    expect(blocked.body.error.message).toMatch(/1 application/);

    // 2. Opted in but the title does not match: still refused.
    const mistyped = await admin
      .delete(`/api/admin/opportunities/${job.id}`)
      .send({ deleteApplications: true, confirmTitle: "busy role" })
      .expect(400);
    expect(mistyped.body.error.fields.confirmTitle).toBeTruthy();
    expect((await admin.get("/api/admin/applications").expect(200)).body.total).toBe(1);

    // 3. Opted in with the exact title: the opportunity and its application go.
    const done = await admin
      .delete(`/api/admin/opportunities/${job.id}`)
      .send({ deleteApplications: true, confirmTitle: "Busy Role" })
      .expect(200);
    expect(done.body).toEqual({ deletedApplications: 1 });

    await admin.get(`/api/admin/opportunities/${job.id}`).expect(404);
    expect((await admin.get("/api/admin/applications").expect(200)).body.total).toBe(0);
    expect((await applicant.get("/api/me/applications").expect(200)).body).toEqual([]);
  });

  it("removes the deleted opportunity from candidates' saved lists", async () => {
    const job = (await admin.post("/api/admin/opportunities").send(opportunity({ title: "Saved Role" })).expect(201)).body;
    await candidate.put(`/api/me/saved/${job.id}`).expect(204);
    expect((await candidate.get("/api/me/saved").expect(200)).body).toHaveLength(1);

    await admin.delete(`/api/admin/opportunities/${job.id}`).send({}).expect(200);
    expect((await candidate.get("/api/me/saved").expect(200)).body).toEqual([]);
  });
});
