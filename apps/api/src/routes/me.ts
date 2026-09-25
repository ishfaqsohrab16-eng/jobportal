import path from "node:path";
import { Router } from "express";
import { applySchema, derivePublicStatus, profileSchema } from "@digibizz/jobs-shared";
import { currentUser, requireAuth, requireRole } from "../lib/auth";
import { badRequest, body, conflict, HttpError, notFound, objectIdParam } from "../lib/http";
import { RESUME_DIR, removeFile, resumeUpload, sendStoredFile } from "../lib/uploads";
import { ApplicationModel, OpportunityModel, UserModel } from "../models";
import { toApplicationDTO, toOpportunityDTO, toUserDTO } from "../serializers";

export const meRouter = Router();
meRouter.use(requireAuth);

meRouter.put("/profile", async (req, res) => {
  const input = body(req, profileSchema);
  const user = currentUser(req);
  user.set(input);
  await user.save();
  res.json({ user: toUserDTO(user) });
});

/* --------------------------------------------------------------- resume */

meRouter.put("/resume", resumeUpload, async (req, res) => {
  if (!req.file) throw badRequest("Attach your resume as a PDF or Word file");
  const user = currentUser(req);
  // Old files are kept: applications already submitted still point at them.
  user.resume = {
    fileName: path.basename(req.file.originalname).slice(0, 120),
    storedName: req.file.filename,
    mimeType: req.file.mimetype,
    size: req.file.size,
    uploadedAt: new Date(),
  };
  await user.save();
  res.json({ user: toUserDTO(user) });
});

meRouter.get("/resume", (req, res, next) => {
  const resume = currentUser(req).resume;
  if (!resume) throw notFound("Resume");
  sendStoredFile(res, next, RESUME_DIR, resume.storedName, resume.fileName);
});

meRouter.delete("/resume", async (req, res) => {
  const user = currentUser(req);
  const stored = user.resume?.storedName;
  user.resume = null;
  await user.save();
  if (stored && !(await ApplicationModel.exists({ "resume.storedName": stored }))) removeFile(RESUME_DIR, stored);
  res.json({ user: toUserDTO(user) });
});

/* ---------------------------------------------------------------- saved */

meRouter.get("/saved", async (req, res) => {
  const docs = await OpportunityModel.find({ _id: { $in: currentUser(req).saved }, status: { $ne: "draft" } })
    .sort({ deadline: 1 })
    .populate("organization");
  res.json(docs.map((d) => toOpportunityDTO(d, { saved: true, applicationStatus: null })));
});

meRouter.put("/saved/:id", async (req, res) => {
  const id = objectIdParam(req);
  if (!(await OpportunityModel.exists({ _id: id }))) throw notFound("Opportunity");
  await UserModel.updateOne({ _id: currentUser(req)._id }, { $addToSet: { saved: id } });
  res.status(204).end();
});

meRouter.delete("/saved/:id", async (req, res) => {
  await UserModel.updateOne({ _id: currentUser(req)._id }, { $pull: { saved: objectIdParam(req) } });
  res.status(204).end();
});

/* --------------------------------------------------------- applications */

meRouter.get("/applications", async (req, res) => {
  const apps = await ApplicationModel.find({ user: currentUser(req)._id }).sort({ createdAt: -1 }).populate("opportunity");
  res.json(apps.map((a) => toApplicationDTO(a)));
});

meRouter.post("/applications/:id", requireRole("candidate"), async (req, res) => {
  const input = body(req, applySchema);
  const user = currentUser(req);
  const opp = await OpportunityModel.findById(objectIdParam(req));
  if (!opp || opp.status === "draft") throw notFound("Opportunity");
  if (derivePublicStatus(opp.status, opp.deadline) !== "open") {
    throw new HttpError(410, "closed", "This opportunity is no longer accepting applications");
  }
  if (opp.externalApplyUrl) throw badRequest("Applications for this opportunity are taken on the organization's own website");
  if (!user.resume) throw badRequest("Upload your resume before applying", { resume: "Required" });
  if (await ApplicationModel.exists({ opportunity: opp._id, user: user._id })) {
    throw conflict("You have already applied for this opportunity");
  }

  const app = await ApplicationModel.create({
    opportunity: opp._id,
    user: user._id,
    coverLetter: input.coverLetter,
    phone: input.phone,
    city: input.city,
    expectedSalary: input.expectedSalary ?? null,
    source: input.source.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40) || "direct",
    resume: user.resume,
    history: [{ status: "submitted", note: "", at: new Date() }],
  });
  await OpportunityModel.updateOne({ _id: opp._id }, { $inc: { applicationsCount: 1 } });

  // Keep the profile useful for the next application.
  if (!user.phone || (!user.city && input.city)) {
    user.phone ||= input.phone;
    user.city ||= input.city;
    await user.save();
  }

  await app.populate("opportunity");
  res.status(201).json(toApplicationDTO(app));
});

meRouter.post("/applications/:id/withdraw", async (req, res) => {
  const app = await ApplicationModel.findOne({ _id: objectIdParam(req), user: currentUser(req)._id });
  if (!app) throw notFound("Application");
  if (["hired", "rejected", "withdrawn"].includes(app.status)) throw badRequest("This application can no longer be withdrawn");
  app.status = "withdrawn";
  app.history.push({ status: "withdrawn", note: "Withdrawn by candidate", at: new Date() });
  await app.save();
  await app.populate("opportunity");
  res.json(toApplicationDTO(app));
});
