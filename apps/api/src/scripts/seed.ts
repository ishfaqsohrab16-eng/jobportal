/**
 * npm run seed         -> make sure the admin from ADMIN_EMAIL/ADMIN_PASSWORD exists
 * npm run seed:demo    -> also load demo organizations/opportunities and print a demo partner API key
 *
 * Demo data is only inserted into an empty database; it refuses to touch real data.
 */
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { slugify, type OpportunityData } from "@digibizz/jobs-shared";
import { connectDb, disconnectDb } from "../db";
import { ApiKeyModel, OpportunityModel, OrganizationModel, UserModel } from "../models";
import { hashApiKey } from "../partner/auth";
import { ensureAdmin } from "../services/bootstrap";

const day = (offset: number) => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offset);
  return d;
};

const ORGS = [
  { name: "DigiBizz Balochistan", category: "government", city: "Quetta", website: "https://digibizz.pk", verified: true, about: "Digital skills and freelancing program empowering youth across Balochistan." },
  { name: "Bolan Software House", category: "private", city: "Quetta", website: "https://example.com/bolan", verified: true, about: "Product studio building web and mobile apps for local and international clients. (Demo organization)" },
  { name: "Makran Cloud Systems", category: "private", city: "Gwadar", website: "https://example.com/makran", verified: false, about: "Cloud infrastructure and managed DevOps services. (Demo organization)" },
  { name: "Provincial IT Directorate", category: "government", city: "Quetta", website: "", verified: true, about: "Provincial e-governance and IT infrastructure. (Demo organization)" },
  { name: "Global Tech Relief Network", category: "international", city: "Islamabad", website: "https://example.com/gtrn", verified: true, about: "International NGO running digital inclusion projects. (Demo organization)" },
  { name: "Indus Analytics", category: "private", city: "Karachi", website: "https://example.com/indus", verified: false, about: "Data engineering and AI consultancy. (Demo organization)" },
] as const;

type Seed = Partial<OpportunityData> & Pick<OpportunityData, "type" | "title" | "description"> & { org: number; deadlineIn: number | null };

const OPPS: Seed[] = [
  {
    org: 1, type: "job", title: "Senior React Developer", field: "Web Development", deadlineIn: 21, featured: true,
    summary: "Lead front-end work on SaaS products used by 40k+ businesses.",
    description: "Bolan Software House is hiring a Senior React Developer to lead the front-end of our flagship SaaS products.\n\nYou will own architecture decisions, mentor two mid-level engineers and work directly with product and design.",
    responsibilities: ["Own the React/TypeScript front-end architecture", "Review code and mentor developers", "Ship accessible, fast interfaces"],
    requirements: ["4+ years with React and TypeScript", "Experience with Redux Toolkit or similar", "Strong CSS and accessibility fundamentals"],
    skills: ["React", "TypeScript", "Redux", "Tailwind CSS", "Testing"],
    education: "Bachelor's (16 years)", qualification: "BS Computer Science / Software Engineering",
    experienceMinYears: 4, experienceMaxYears: 8, ageMin: 24, ageMax: 40, city: "Quetta", workMode: "hybrid",
    employmentType: "full_time", positions: 2, salaryMin: 250000, salaryMax: 380000, contractDuration: "Permanent",
    benefits: ["Medical insurance", "Annual bonus", "Laptop allowance", "Hybrid work"], category: "private",
  },
  {
    org: 2, type: "job", title: "DevOps Engineer (AWS)", field: "Cloud & DevOps", deadlineIn: 12,
    summary: "Build and run CI/CD and AWS infrastructure for port logistics systems.",
    description: "Design, automate and operate cloud infrastructure for logistics platforms running at Gwadar port.",
    requirements: ["2+ years AWS", "Terraform or CloudFormation", "Docker and Kubernetes"],
    skills: ["AWS", "Terraform", "Docker", "Kubernetes", "Linux"], education: "Bachelor's (16 years)",
    qualification: "BS CS/IT or equivalent", experienceMinYears: 2, experienceMaxYears: 5, city: "Gwadar", workMode: "onsite",
    employmentType: "full_time", positions: 1, salaryMin: 200000, salaryMax: 300000, contractDuration: "1 year (extendable)",
    benefits: ["Accommodation", "Transport", "Health cover"], category: "private",
  },
  {
    org: 3, type: "job", title: "Network Administrator (BPS-17)", field: "Networking & Telecom", deadlineIn: 5, featured: true,
    summary: "Maintain provincial data-centre network and secretariat connectivity.",
    description: "The Directorate invites applications for the post of Network Administrator (BPS-17) on contract basis.",
    requirements: ["CCNA/CCNP certification", "Domicile of Balochistan"], skills: ["Cisco", "Firewalls", "VLANs", "Windows Server"],
    education: "Bachelor's (16 years)", qualification: "BS Telecom / CS / IT", experienceMinYears: 3, gender: "any", ageMin: 22, ageMax: 35,
    city: "Quetta", workMode: "onsite", employmentType: "contract", positions: 4, salaryMin: 120000, salaryMax: 150000,
    contractDuration: "3 years", benefits: ["Government allowances", "Leave as per rules"], category: "government",
  },
  {
    org: 4, type: "job", title: "Cybersecurity Analyst", field: "Cybersecurity", deadlineIn: 30,
    description: "Protect beneficiaries' data across our digital inclusion programs in Pakistan. Monitor, triage and respond to security events.",
    requirements: ["SOC or blue-team experience", "Knowledge of ISO 27001"], skills: ["SIEM", "Incident Response", "ISO 27001"],
    education: "Bachelor's (16 years)", qualification: "BS Cybersecurity / CS", experienceMinYears: 3, experienceMaxYears: 6,
    city: "Islamabad", workMode: "remote", employmentType: "contract", positions: 1, salaryMin: 3500, salaryMax: 4500,
    salaryCurrency: "USD", contractDuration: "18 months", benefits: ["International health insurance", "Remote work", "Learning budget"],
    category: "international",
  },
  {
    org: 5, type: "job", title: "Junior Data Analyst", field: "Data Science & AI", deadlineIn: 18,
    description: "Clean, analyze and visualize client datasets. Fresh graduates with strong SQL and Python are encouraged to apply.",
    skills: ["SQL", "Python", "Power BI"], education: "Bachelor's (16 years)", experienceMinYears: 0, experienceMaxYears: 1,
    city: "Karachi", workMode: "hybrid", employmentType: "full_time", positions: 3, salaryMin: 90000, salaryMax: 130000,
    contractDuration: "Permanent", benefits: ["Training", "OPD cover"], category: "private",
  },
  {
    org: 3, type: "job", title: "Office Assistant", field: "Administration", deadlineIn: 9, isITRelated: false,
    description: "General office support for the Directorate. (Non-IT role - excluded from the IndusTech feed.)",
    education: "Intermediate", city: "Quetta", workMode: "onsite", employmentType: "contract", positions: 2,
    salaryMin: 45000, salaryMax: 55000, category: "government",
  },
  {
    org: 1, type: "internship", title: "Frontend Engineering Intern", field: "Web Development", deadlineIn: 14, featured: true,
    description: "A 3-month paid internship shipping real features with our product team. Mentorship from senior engineers every week.",
    eligibility: "Final-year students or fresh graduates of BS CS/SE/IT.", duration: "3 months", skills: ["HTML", "CSS", "JavaScript", "React"],
    city: "Quetta", workMode: "onsite", employmentType: "full_time", positions: 5, salaryMin: 35000, salaryMax: 35000,
    benefits: ["Stipend", "Experience letter", "Chance of full-time offer"], category: "private",
  },
  {
    org: 3, type: "internship", title: "e-Governance Internship Program", field: "IT Project Management", deadlineIn: 25,
    description: "Work with provincial departments on digitization projects: requirement gathering, testing and user training.",
    eligibility: "Graduates (16 years) in CS/IT/SE, domicile of Balochistan, age up to 28.", duration: "6 months", ageMax: 28,
    city: "Quetta", workMode: "onsite", positions: 30, salaryMin: 40000, salaryMax: 40000, benefits: ["Monthly stipend", "Certificate"],
    category: "government",
  },
  {
    org: 5, type: "internship", title: "Machine Learning Research Intern", field: "Data Science & AI", deadlineIn: 3,
    description: "Assist in building NLP models for Urdu and Balochi text classification.", eligibility: "BS/MS students with Python and ML coursework.",
    duration: "4 months", skills: ["Python", "PyTorch", "NLP"], city: "Karachi", workMode: "remote", positions: 2,
    salaryMin: 50000, salaryMax: 60000, category: "private",
  },
  {
    org: 0, type: "program", title: "Certified Full-Stack Web Development", field: "Web Development", deadlineIn: 20, featured: true,
    description: "A 6-month program covering HTML/CSS, JavaScript, React, Node.js and databases, ending in a capstone project and job placement support.",
    eligibility: "Age 18-35, intermediate or above, residents of Balochistan.", duration: "6 months", ageMin: 18, ageMax: 35,
    skills: ["HTML", "CSS", "JavaScript", "React", "Node.js", "MongoDB"], city: "Quetta", workMode: "hybrid", positions: 120, fee: 0,
    certification: "DigiBizz certificate", benefits: ["Free laptop access", "Monthly stipend for top performers", "Placement support"],
    category: "government",
  },
  {
    org: 4, type: "program", title: "Women in Cloud Scholarship", field: "Cloud & DevOps", deadlineIn: 40,
    description: "Fully funded cloud certification track for women, including exam vouchers and mentorship.", eligibility: "Women, graduates in any STEM discipline.",
    duration: "16 weeks", gender: "female", skills: ["AWS", "Azure", "Linux"], workMode: "remote", positions: 60, fee: 0,
    certification: "AWS Solutions Architect – Associate (voucher included)", benefits: ["Exam voucher", "Mentor", "Community"],
    category: "international", city: "",
  },
  {
    org: 0, type: "training", title: "Freelancing Bootcamp: Upwork & Fiverr", field: "Freelancing", deadlineIn: 7, featured: true,
    description: "A hands-on bootcamp to set up profiles, write winning proposals and land your first international client.",
    eligibility: "Anyone with a laptop and basic English.", duration: "4 weeks", skills: ["Proposal writing", "Client communication", "Upwork"],
    city: "Turbat", workMode: "onsite", positions: 50, fee: 0, certification: "Certificate of completion",
    benefits: ["Live client project", "Payoneer setup support"], category: "government",
  },
  {
    org: 0, type: "training", title: "Graphic Design with Figma", field: "UI/UX & Graphic Design", deadlineIn: 16,
    description: "Learn design fundamentals, Figma and portfolio building across 6 weeks of evening classes.",
    eligibility: "Matric or above.", duration: "6 weeks", skills: ["Figma", "Typography", "Branding"], city: "Khuzdar", workMode: "onsite",
    positions: 40, fee: 0, certification: "Certificate of completion", category: "government",
  },
  {
    org: 2, type: "training", title: "Kubernetes in Production Workshop", field: "Cloud & DevOps", deadlineIn: null,
    description: "Two-day intensive workshop for engineers running containers in production.", eligibility: "Working knowledge of Docker.",
    duration: "2 days", skills: ["Kubernetes", "Helm", "Observability"], city: "Karachi", workMode: "onsite", positions: 25, fee: 25000,
    certification: "Workshop certificate", category: "private",
  },
];

async function seedDemo() {
  if ((await OpportunityModel.estimatedDocumentCount()) > 0) {
    console.log("Opportunities already exist - skipping demo data.");
    return;
  }
  const orgs = await OrganizationModel.insertMany(ORGS.map((o) => ({ ...o, country: "Pakistan", slug: slugify(o.name) })));
  const admin = await UserModel.findOne({ role: "admin" });

  await OpportunityModel.insertMany(
    OPPS.map(({ org: orgIndex, deadlineIn, ...o }, i) => {
      const org = orgs[orgIndex]!;
      return {
        country: "Pakistan",
        isITRelated: true,
        category: org.category,
        ...o,
        organization: org._id,
        organizationName: org.name,
        slug: `${slugify(`${o.title} ${org.name}`)}`,
        deadline: deadlineIn == null ? null : day(deadlineIn),
        startDate: deadlineIn == null ? null : day(deadlineIn + 14),
        status: "open",
        publishedAt: new Date(Date.now() - (i + 1) * 3_600_000 * 7),
        createdBy: admin?._id ?? null,
      };
    }),
  );

  if (!(await UserModel.exists({ email: "candidate@demo.pk" }))) {
    await UserModel.create({
      name: "Demo Candidate",
      email: "candidate@demo.pk",
      passwordHash: await bcrypt.hash("Candidate123", 12),
      role: "candidate",
      city: "Quetta",
      headline: "Junior web developer",
      skills: ["HTML", "CSS", "JavaScript"],
    });
  }

  const secret = `dbz_live_${crypto.randomBytes(24).toString("base64url")}`;
  await ApiKeyModel.create({ name: "IndusTech Connect (demo)", partnerSlug: "industechconnect", prefix: secret.slice(0, 13), hash: hashApiKey(secret) });

  console.log(`Seeded ${orgs.length} organizations and ${OPPS.length} opportunities.`);
  console.log("Demo candidate: candidate@demo.pk / Candidate123");
  console.log(`Demo partner API key (shown once): ${secret}`);
}

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
