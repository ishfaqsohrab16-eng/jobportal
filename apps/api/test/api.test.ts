import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import { MongoMemoryServer } from "mongodb-memory-server";
import type { Express } from "express";

let mongo: MongoMemoryServer;
let app: Express;
let admin: ReturnType<typeof request.agent>;
let candidate: ReturnType<typeof request.agent>;
let orgId: string;

const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

const opportunity = (over: Record<string, unknown> = {}) => ({
  type: "job",
  title: "Backend Engineer",
  organizationId: orgId,
  category: "private",
  isITRelated: true,
  field: "Software Development",
  description: "Build and run the APIs behind our products for customers in Pakistan.",
  requirements: ["Node.js", "MongoDB"],
  skills: ["Node.js", "TypeScript"],
  education: "Bachelor's (16 years)",
  qualification: "BS CS",
  experienceMinYears: 2,
  experienceMaxYears: 5,
  gender: "any",
  ageMin: 22,
  ageMax: 40,
  city: "Quetta",
  workMode: "onsite",
  employmentType: "full_time",
  positions: 3,
  salaryMin: 150000,
  salaryMax: 250000,
  contractDuration: "Permanent",
  benefits: ["Health insurance"],
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
  await connectDb(mongo.getUri("jobs_test"));
  const { createApp } = await import("../src/app");
  const { UserModel } = await import("../src/models");
  app = createApp();

  await UserModel.create({ name: "Admin", email: "admin@test.pk", role: "admin", passwordHash: await bcrypt.hash("Admin12345", 4) });
  admin = request.agent(app);
  await admin.post("/api/auth/login").send({ email: "admin@test.pk", password: "Admin12345" }).expect(200);

  candidate = request.agent(app);
});

afterAll(async () => {
  const { disconnectDb } = await import("../src/db");
  await disconnectDb();
  await mongo?.stop();
});

describe("auth", () => {
  it("registers, reads the session and rejects bad logins", async () => {
    const res = await candidate
      .post("/api/auth/register")
      .send({ name: "Ayesha Baloch", email: "Ayesha@Test.pk", password: "Secret123", phone: "03001234567" })
      .expect(201);
    expect(res.body.user.email).toBe("ayesha@test.pk");
    expect(res.headers["set-cookie"]?.[0]).toMatch(/HttpOnly/);

    const me = await candidate.get("/api/auth/me").expect(200);
    expect(me.body.user.role).toBe("candidate");

    await request(app).post("/api/auth/login").send({ email: "ayesha@test.pk", password: "wrong-pass1" }).expect(401);
    await request(app).get("/api/admin/overview").expect(401);
    await candidate.get("/api/admin/overview").expect(403);
  });

  it("validates input with field errors", async () => {
    const res = await request(app).post("/api/auth/register").send({ name: "A", email: "nope", password: "short" }).expect(400);
    expect(Object.keys(res.body.error.fields)).toEqual(expect.arrayContaining(["name", "email", "password"]));
  });
});

describe("admin + public listings", () => {
  it("creates an organization and opportunities", async () => {
    const org = await admin
      .post("/api/admin/organizations")
      .send({ name: "Bolan Software House", category: "private", website: "https://example.com", city: "Quetta" })
      .expect(201);
    orgId = org.body.id;
    expect(org.body.slug).toBe("bolan-software-house");

    await admin.post("/api/admin/opportunities").send(opportunity()).expect(201);
    await admin.post("/api/admin/opportunities").send(opportunity({ title: "Receptionist", isITRelated: false, field: "Administration" })).expect(201);
    await admin.post("/api/admin/opportunities").send(opportunity({ title: "Hidden Draft Role", status: "draft" })).expect(201);
    await admin.post("/api/admin/opportunities").send(opportunity({ title: "Old Role", deadline: day(-3) })).expect(201);
    await admin
      .post("/api/admin/opportunities")
      .send(opportunity({ type: "internship", title: "Web Intern", duration: "3 months", eligibility: "Final year students", employmentType: null }))
      .expect(201);
    await admin
      .post("/api/admin/opportunities")
      .send(opportunity({ type: "training", title: "Freelancing Bootcamp", duration: "4 weeks", fee: 0, employmentType: null }))
      .expect(201);
  });

  it("rejects inconsistent ranges", async () => {
    const res = await admin.post("/api/admin/opportunities").send(opportunity({ salaryMin: 300000, salaryMax: 100000 })).expect(400);
    expect(res.body.error.fields.salaryMax).toBeTruthy();
  });

  it("lists only live opportunities publicly", async () => {
    const res = await request(app).get("/api/opportunities?type=job").expect(200);
    const titles = res.body.items.map((o: { title: string }) => o.title);
    expect(titles).toEqual(expect.arrayContaining(["Backend Engineer", "Receptionist"]));
    expect(titles).not.toContain("Hidden Draft Role");
    expect(titles).not.toContain("Old Role");

    const search = await request(app).get("/api/opportunities?q=typescript").expect(200);
    expect(search.body.items.every((o: { skills: string[] }) => o.skills.includes("TypeScript"))).toBe(true);
  });

  it("hides drafts from the public detail page but shows expired ones as expired", async () => {
    const list = await admin.get("/api/admin/opportunities?status=draft").expect(200);
    await request(app).get(`/api/opportunities/${list.body.items[0].slug}`).expect(404);

    const old = await admin.get("/api/admin/opportunities?q=Old%20Role").expect(200);
    const detail = await request(app).get(`/api/opportunities/${old.body.items[0].slug}`).expect(200);
    expect(detail.body.publicStatus).toBe("expired");
  });
});

describe("applying", () => {
  it("requires a resume, then accepts one application per opportunity", async () => {
    const list = await request(app).get("/api/opportunities?q=Backend").expect(200);
    const job = list.body.items[0];

    const noResume = await candidate.post(`/api/me/applications/${job.id}`).send({ phone: "03001234567" }).expect(400);
    expect(noResume.body.error.fields.resume).toBeTruthy();

    await candidate
      .put("/api/me/resume")
      .attach("resume", Buffer.from("%PDF-1.4 test"), { filename: "cv.pdf", contentType: "application/pdf" })
      .expect(200);
    await candidate
      .put("/api/me/resume")
      .attach("resume", Buffer.from("MZ"), { filename: "evil.exe", contentType: "application/x-msdownload" })
      .expect(400);

    const applied = await candidate
      .post(`/api/me/applications/${job.id}`)
      .send({ phone: "03001234567", coverLetter: "Hello", source: "industechconnect" })
      .expect(201);
    expect(applied.body.status).toBe("submitted");
    expect(applied.body.source).toBe("industechconnect");

    await candidate.post(`/api/me/applications/${job.id}`).send({ phone: "03001234567" }).expect(409);

    const detail = await candidate.get(`/api/opportunities/${job.slug}`).expect(200);
    expect(detail.body.viewer.applicationStatus).toBe("submitted");

    const apps = await admin.get(`/api/admin/applications?opportunity=${job.id}`).expect(200);
    expect(apps.body.total).toBe(1);
    const updated = await admin.patch(`/api/admin/applications/${apps.body.items[0].id}/status`).send({ status: "shortlisted" }).expect(200);
    expect(updated.body.history.map((h: { status: string }) => h.status)).toEqual(["submitted", "shortlisted"]);
    await admin.get(`/api/admin/applications/${apps.body.items[0].id}/resume`).expect(200);
  });
});

describe("partner API", () => {
  let secret: string;
  let keyId: string;

  it("rejects requests without a valid key", async () => {
    await request(app).get("/api/partner/v1/jobs").expect(401);
    await request(app).get("/api/partner/v1/jobs").set("X-API-Key", "dbz_live_nope").expect(401);
    await request(app).get("/api/partner/v1/openapi.json").expect(200);
  });

  it("issues a key once and serves IT-only jobs with every requested field", async () => {
    const created = await admin.post("/api/admin/api-keys").send({ name: "IndusTech", partnerSlug: "industechconnect" }).expect(201);
    secret = created.body.secret;
    keyId = created.body.key.id;
    expect(secret).toMatch(/^dbz_live_/);
    const keys = await admin.get("/api/admin/api-keys").expect(200);
    expect(JSON.stringify(keys.body)).not.toContain(secret);

    const res = await request(app).get("/api/partner/v1/jobs").set("X-API-Key", secret).expect(200);
    const titles = res.body.data.map((j: { title: string }) => j.title);
    expect(titles).toContain("Backend Engineer");
    expect(titles).not.toContain("Receptionist"); // non-IT
    expect(titles).not.toContain("Old Role"); // expired
    expect(titles).not.toContain("Hidden Draft Role");

    const job = res.body.data.find((j: { title: string }) => j.title === "Backend Engineer");
    // The 15 fields IndusTech asked for.
    expect(job).toMatchObject({
      title: "Backend Engineer",
      location: { country: "Pakistan", city: "Quetta" },
      employer_name: "Bolan Software House",
      number_of_positions: 3,
      salary: { min: 150000, max: 250000, currency: "PKR" },
      gender: "any",
      age_limit: { min: 22, max: 40 },
      education: "Bachelor's (16 years)",
      qualification: "BS CS",
      experience: { min_years: 2, max_years: 5 },
      skills: ["Node.js", "TypeScript"],
      requirements: ["Node.js", "MongoDB"],
      contract_duration: "Permanent",
      benefits: ["Health insurance"],
      application_deadline: day(10),
      status: "open",
      category: "Private",
    });
    expect(job.description).toBeTruthy();
    expect(job.apply_link).toMatch(/\/opportunities\/.+\/apply\?ref=industechconnect$/);
    expect(res.body.meta).toMatchObject({ page: 1, total: 1, total_pages: 1 });

    const one = await request(app).get(`/api/partner/v1/jobs/${job.id}`).set("Authorization", `Bearer ${secret}`).expect(200);
    expect(one.body.data.slug).toBe(job.slug);
    await request(app).get(`/api/partner/v1/jobs/${job.slug}`).set("X-API-Key", secret).expect(200);
  });

  it("serves internships and trainings, and filters by status", async () => {
    const interns = await request(app).get("/api/partner/v1/internships").set("X-API-Key", secret).expect(200);
    expect(interns.body.data[0]).toMatchObject({ title: "Web Intern", duration: "3 months", eligibility: "Final year students" });

    const trainings = await request(app).get("/api/partner/v1/trainings").set("X-API-Key", secret).expect(200);
    expect(trainings.body.data[0]).toMatchObject({ title: "Freelancing Bootcamp", fee: { amount: 0, is_free: true } });

    const programs = await request(app).get("/api/partner/v1/programs").set("X-API-Key", secret).expect(200);
    expect(programs.body.data).toEqual([]);

    const expired = await request(app).get("/api/partner/v1/jobs?status=expired").set("X-API-Key", secret).expect(200);
    expect(expired.body.data.map((j: { title: string }) => j.title)).toEqual(["Old Role"]);

    const later = await request(app).get(`/api/partner/v1/jobs?updated_since=${day(1)}`).set("X-API-Key", secret).expect(200);
    expect(later.body.data).toEqual([]);
  });

  it("tracks usage and stops working once revoked", async () => {
    const usage = await admin.get(`/api/admin/api-keys/${keyId}/usage`).expect(200);
    expect(usage.body.at(-1).count).toBeGreaterThan(0);
    await admin.post(`/api/admin/api-keys/${keyId}/revoke`).expect(200);
    await request(app).get("/api/partner/v1/jobs").set("X-API-Key", secret).expect(401);
  });

  it("enforces scopes", async () => {
    const created = await admin.post("/api/admin/api-keys").send({ name: "Jobs only", partnerSlug: "jobs-only", scopes: ["jobs"] }).expect(201);
    await request(app).get("/api/partner/v1/trainings").set("X-API-Key", created.body.secret).expect(403);
    await request(app).get("/api/partner/v1/jobs").set("X-API-Key", created.body.secret).expect(200);
  });
});
