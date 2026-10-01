import {
  APPLICATION_STATUS_LABEL,
  DIGIBIZZ,
  deadlineLabel,
  formatDate,
  formatLocation,
  OPPORTUNITY_TYPE_META,
  type ApplicationStatus,
} from "@digibizz/jobs-shared";
import { config } from "../../config";
import type { OpportunityDoc, UserDoc } from "../../models";
import { sendMail, sendMailInBackground, emailEnabled, reportEmailSetup } from "./brevo";
import { renderEmail, type Block } from "./layout";

export { emailEnabled, reportEmailSetup };

const to = (u: Pick<UserDoc, "name" | "email">) => ({ email: u.email, name: u.name });
const firstName = (name: string) => name.trim().split(/\s+/)[0] || "there";
const url = (path: string) => `${config.publicWebUrl}${path}`;

/** Build + send in one step; returns false when email is off or the send failed. */
function deliver(args: { to: { email: string; name?: string }; subject: string; tag: string; preheader: string; heading: string; blocks: Block[] }, background = true) {
  const { html, text } = renderEmail({ preheader: args.preheader, heading: args.heading, blocks: args.blocks });
  const mail = { to: args.to, subject: args.subject, tag: args.tag, html, text };
  if (background) {
    sendMailInBackground(mail);
    return Promise.resolve(true);
  }
  return sendMail(mail);
}

const opportunityRows = (o: OpportunityDoc) => [
  { label: OPPORTUNITY_TYPE_META[o.type].label, value: o.title },
  { label: "Organization", value: DIGIBIZZ.name },
  { label: "Location", value: formatLocation(o) },
  { label: "Deadline", value: o.deadline ? `${formatDate(o.deadline)} (${deadlineLabel(o.deadline)})` : "Rolling" },
];

/* ------------------------------------------------------------- account */

export function sendWelcomeEmail(user: UserDoc) {
  return deliver({
    to: to(user),
    tag: "welcome",
    subject: `Welcome to the ${DIGIBIZZ.name} jobs portal`,
    preheader: "Add your resume once and apply to every opportunity in a couple of clicks.",
    heading: `Welcome, ${firstName(user.name)}!`,
    blocks: [
      { p: `Your account on the ${DIGIBIZZ.name} jobs portal is ready. One profile now covers every job, internship, program and training we publish.` },
      { p: "To be ready the moment something suits you, upload your resume and fill in your skills and education. Applications then take only a few clicks." },
      { button: { label: "Complete your profile", url: url("/me/profile") } },
      { p: `Browse what's open: <a href="${url("/jobs")}" style="color:#0b9a5c">Jobs</a> · <a href="${url("/internships")}" style="color:#0b9a5c">Internships</a> · <a href="${url("/programs")}" style="color:#0b9a5c">Programs &amp; Courses</a> · <a href="${url("/trainings")}" style="color:#0b9a5c">Trainings</a>`, html: true },
    ],
  });
}

export function sendPasswordChangedEmail(user: UserDoc, opts: { reset?: boolean } = {}) {
  return deliver({
    to: to(user),
    tag: "password-changed",
    subject: "Your DigiBizz Jobs password was changed",
    preheader: "If this wasn't you, contact DigiBizz immediately.",
    heading: "Your password was changed",
    blocks: [
      { p: `Hi ${firstName(user.name)}, the password for your ${DIGIBIZZ.name} jobs portal account was ${opts.reset ? "reset" : "changed"} on ${formatDate(new Date())}.` },
      { note: "If you did not do this, your account may be at risk. Reset your password straight away and contact DigiBizz Balochistan." },
      { button: { label: "Sign in", url: url("/login") } },
    ],
  });
}

/** Sent in the foreground: the user is waiting to hear that the link is on its way. */
export function sendPasswordResetEmail(user: UserDoc, token: string, ttlMinutes: number) {
  const link = url(`/reset-password?token=${encodeURIComponent(token)}`);
  return deliver(
    {
      to: to(user),
      tag: "password-reset",
      subject: "Reset your DigiBizz Jobs password",
      preheader: `This link works for ${ttlMinutes} minutes.`,
      heading: "Reset your password",
      blocks: [
        { p: `Hi ${firstName(user.name)}, we received a request to reset the password for your ${DIGIBIZZ.name} jobs portal account.` },
        { button: { label: "Choose a new password", url: link } },
        { p: `This link expires in ${ttlMinutes} minutes and can be used once. If the button doesn't work, copy this address into your browser:` },
        { p: `<span style="word-break:break-all;color:#6b7280;font-size:13px">${link}</span>`, html: true },
        { note: "If you did not ask for this, you can ignore this email - your password stays as it is." },
      ],
    },
    false,
  );
}

/* -------------------------------------------------------- applications */

export function sendApplicationReceivedEmail(user: UserDoc, o: OpportunityDoc) {
  return deliver({
    to: to(user),
    tag: "application-received",
    subject: `Application received: ${o.title}`,
    preheader: `${DIGIBIZZ.name} has your application for ${o.title}.`,
    heading: "We have your application",
    blocks: [
      { p: `Hi ${firstName(user.name)}, thank you for applying. ${DIGIBIZZ.name} has received your application and will review it shortly.` },
      { rows: opportunityRows(o) },
      { p: "You can follow its progress at any time, and we will email you whenever the status changes." },
      { button: { label: "Track your application", url: url("/me") } },
    ],
  });
}

const STATUS_COPY: Partial<Record<ApplicationStatus, { subject: string; heading: string; body: string }>> = {
  reviewing: { subject: "Your application is under review", heading: "Your application is being reviewed", body: "Our team has started reviewing your application. We will be in touch as soon as there is news." },
  shortlisted: { subject: "You have been shortlisted", heading: "Good news - you're shortlisted!", body: "Your application stood out and you have been shortlisted. Please keep an eye on your email and phone for the next step." },
  interview: { subject: "Interview stage", heading: "You're invited to interview", body: "You have moved to the interview stage. Details of the time and place will follow - please watch your email and phone." },
  offered: { subject: "You have an offer", heading: "Congratulations - you have an offer!", body: "We are delighted to let you know that you have been offered this position. Our team will contact you with the details." },
  hired: { subject: "Welcome aboard", heading: "Congratulations!", body: "Your application was successful and you have been selected. Welcome to the team - we will be in touch about the next steps." },
  rejected: { subject: "Update on your application", heading: "Update on your application", body: "Thank you for your interest and for the time you spent applying. On this occasion we have decided to proceed with other candidates. We genuinely encourage you to apply for future opportunities." },
};

export function sendApplicationStatusEmail(user: UserDoc, o: OpportunityDoc, status: ApplicationStatus, note: string) {
  const copy = STATUS_COPY[status];
  if (!copy) return Promise.resolve(false); // submitted / withdrawn need no email
  return deliver({
    to: to(user),
    tag: `application-${status}`,
    subject: `${copy.subject}: ${o.title}`,
    preheader: `${o.title} - ${APPLICATION_STATUS_LABEL[status]}`,
    heading: copy.heading,
    blocks: [
      { p: `Hi ${firstName(user.name)}, ${copy.body}` },
      { rows: [...opportunityRows(o).slice(0, 2), { label: "Status", value: APPLICATION_STATUS_LABEL[status] }] },
      ...(note ? [{ note: `Message from ${DIGIBIZZ.name}: ${note}` } as Block] : []),
      { button: { label: "View your application", url: url("/me") } },
      ...(status === "rejected"
        ? [{ p: `See what else is open: <a href="${url("/jobs")}" style="color:#0b9a5c">browse opportunities</a>.`, html: true } as Block]
        : []),
    ],
  });
}

/** Heads-up to the admin team that a new application has landed. */
export function sendAdminNewApplicationEmail(adminEmail: string, candidate: UserDoc, o: OpportunityDoc, source: string) {
  return deliver({
    to: { email: adminEmail },
    tag: "admin-new-application",
    subject: `New application: ${o.title}`,
    preheader: `${candidate.name} applied for ${o.title}.`,
    heading: "New application received",
    blocks: [
      { p: `<b>${candidate.name}</b> has applied for <b>${o.title}</b>.`, html: true },
      {
        rows: [
          { label: "Candidate", value: `${candidate.name} (${candidate.email})` },
          { label: OPPORTUNITY_TYPE_META[o.type].label, value: o.title },
          { label: "Source", value: source === "direct" ? "DigiBizz portal" : source },
          { label: "Applications so far", value: String(o.applicationsCount) },
        ],
      },
      { button: { label: "Open the inbox", url: url("/admin/applications") } },
    ],
  });
}
