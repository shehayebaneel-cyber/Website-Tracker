import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth.js";

const prisma = new PrismaClient();

// ---- date helpers (anchored on real "now" so alerts stay meaningful) -------
const now = new Date();
const addDays = (n: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d;
};
const firstOfMonth = (offset: number) => new Date(now.getFullYear(), now.getMonth() + offset, 1);
const dayInMonth = (offset: number, day: number) => new Date(now.getFullYear(), now.getMonth() + offset, day);

// ---- configurable dropdown option lists (from the workbook Settings sheet) --
const OPTION_LISTS: Record<string, string[]> = {
  clientStatus: ["Active", "Trial", "Paused", "Cancelled"],
  websiteStatus: ["Planning", "In Development", "Live", "Paused", "Cancelled"],
  servicePlan: ["Basic", "Standard", "Premium", "Custom"],
  paymentMethod: ["Cash", "Whish", "Bank Transfer", "Card", "Other"],
  chargeType: ["Monthly Subscription", "Setup Fee", "Extra Work", "Domain Renewal", "Hosting Renewal", "Other"],
  expenseCategory: [
    "Domain", "Hosting", "Software", "Database", "Email Service", "Advertising", "Design Assets",
    "Freelancer", "Transaction Fee", "Refund", "Equipment", "Internet", "Office Expense", "Other",
  ],
  supportCategory: ["Content Change", "Design Change", "Bug Fix", "New Feature", "Domain", "Hosting", "Email", "Other"],
  supportStatus: ["Not Started", "In Progress", "Waiting for Client", "Waiting for Payment", "Completed", "Cancelled"],
  priority: ["Low", "Medium", "High", "Urgent"],
  requestSource: ["WhatsApp", "Email", "Phone", "In Person", "Website Form", "Other"],
  renewalFrequency: ["Monthly", "Quarterly", "Every 6 Months", "Yearly", "One Time"],
  accountOwnership: ["Me", "Client", "Shared"],
  reminderStatus: ["Not Sent", "Sent", "Followed Up", "Payment Promised"],
  depositStatus: ["Not Deposited", "Deposited", "Not Applicable"],
  reimbursementStatus: ["Not Reimbursed", "Reimbursed", "Not Applicable"],
  // --- sales module ---
  salespersonStatus: ["Applicant", "Active", "Paused", "Inactive", "Left Company", "Terminated"],
  leadStatus: ["New", "Contacted", "Interested", "Meeting Scheduled", "Proposal Sent", "Negotiating", "Waiting for Client", "Won", "Lost", "Not Interested", "Follow Up Later"],
  leadSource: ["Door-to-door", "Instagram", "WhatsApp", "Phone Call", "Referral", "Existing Client", "Website Inquiry", "Event", "Other"],
  assignmentStatus: ["Active", "Pending", "Transferred", "Ended"],
  contactMethod: ["WhatsApp", "Phone", "Email", "In Person", "Video Call", "Other"],
  clientSatisfaction: ["Very Satisfied", "Satisfied", "Neutral", "Unsatisfied", "At Risk", "No Response"],
  followUpStatus: ["Not Due", "Due", "Completed", "Client Did Not Respond", "Follow-Up Required", "Overdue", "Waived by Admin"],
  commissionStatus: ["Expected", "Waiting for Client Payment", "Waiting for Follow-Up", "Under Review", "Eligible", "Approved", "Included in Payout", "Paid", "Held", "Cancelled", "Reversed"],
  payoutStatus: ["Draft", "Under Review", "Approved", "Partially Paid", "Paid", "Cancelled"],
  commissionMethod: ["Fixed", "Percentage"],
};

const CONFIG_DEFAULTS: Record<string, string> = {
  currency: "USD",
  reminderWindowDays: JSON.stringify([60, 30]),
  company: JSON.stringify({ name: "Aneel — Web Studio", email: process.env.ADMIN_EMAIL ?? "" }),
  defaultBillingDay: "1",
  salesSettings: JSON.stringify({
    defaultSubscription: 20,
    defaultCommission: 5,
    commissionMethod: "Fixed",
    commissionPercent: 25,
    followUpFrequency: "Monthly",
    followUpDueDay: 5,
    commissionBasis: "Collected",
    commissionStopsOnLeave: true,
    followUpRequired: true,
    adminApprovalRequired: true,
    minSellingPrice: 0,
  }),
};

async function seedSettings() {
  for (const [listKey, values] of Object.entries(OPTION_LISTS)) {
    for (let i = 0; i < values.length; i++) {
      await prisma.optionList.upsert({
        where: { listKey_value: { listKey, value: values[i] } },
        update: { order: i, active: true },
        create: { listKey, value: values[i], order: i },
      });
    }
  }
  for (const [key, value] of Object.entries(CONFIG_DEFAULTS)) {
    await prisma.config.upsert({ where: { key }, update: {}, create: { key, value } });
  }
  console.log("✓ Settings option lists + config seeded");
}

async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL ?? "admin@example.com").toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`✓ Admin user already exists (${email})`);
    return;
  }
  await prisma.user.create({
    data: {
      email,
      name: process.env.ADMIN_NAME ?? "Admin",
      passwordHash: await hashPassword(process.env.ADMIN_PASSWORD ?? "ChangeMe123!"),
      role: "OWNER",
    },
  });
  console.log(`✓ Admin user created (${email})`);
}

// helper: upsert a client by code
async function client(code: string, data: any) {
  return prisma.client.upsert({ where: { code }, update: data, create: { code, ...data } });
}
async function website(code: string, clientId: string, data: any) {
  return prisma.website.upsert({ where: { code }, update: { clientId, ...data }, create: { code, clientId, ...data } });
}
async function invoice(code: string, clientId: string, data: any) {
  return prisma.invoice.upsert({ where: { code }, update: { clientId, ...data }, create: { code, clientId, ...data } });
}
async function payment(code: string, clientId: string, invoiceId: string | null, data: any) {
  return prisma.payment.upsert({ where: { code }, update: { clientId, invoiceId, ...data }, create: { code, clientId, invoiceId, ...data } });
}

async function seedSampleData() {
  // ===== C001 — Grey Clinics (the one real client in the workbook) =====
  const grey = await client("C001", {
    businessName: "Grey Clinics",
    contactName: "Dr. Grey",
    phone: "+961 3 000 001",
    website: "https://greyclinics.com",
    city: "Beirut",
    subscriptionStartDate: firstOfMonth(-5),
    billingDay: 1,
    monthlyFee: 20,
    servicePlan: "Basic",
    status: "Active",
    paymentMethod: "Whish",
    notes: "Migrated from the original Websites Tracker workbook.",
  });

  await website("WEB-C001-01", grey.id, {
    projectName: "Grey Clinics Website",
    primaryUrl: "https://greyclinics.com",
    status: "Live",
    projectStartDate: firstOfMonth(-6),
    launchDate: firstOfMonth(-5),
    domainName: "greyclinics.com",
    domainProvider: "Namecheap",
    domainOwner: "Me",
    domainCost: 12,
    domainPurchaseDate: firstOfMonth(-6),
    domainRenewalDate: addDays(48), // Due in 60 Days
    domainAutoRenew: false,
    hostingProvider: "Render",
    hostingOwner: "Me",
    hostingPlan: "Starter",
    hostingCost: 7,
    hostingRenewalDate: addDays(120),
    hostingAutoRenew: true,
    sslExpiryDate: addDays(75),
    repositoryUrl: "https://github.com/aneel/grey-clinics",
    deploymentPlatform: "Render",
    adminUrl: "https://greyclinics.com/admin",
    analyticsInstalled: true,
    searchConsoleInstalled: true,
    lastBackupDate: addDays(-4),
    lastWebsiteUpdate: addDays(-10),
    credentialLocation: "1Password → Grey Clinics",
  });

  // 6 months of subscription invoices (past 5 paid, current month paid) for charts.
  for (let m = -5; m <= 0; m++) {
    const bm = firstOfMonth(m);
    const ym = `${bm.getFullYear()}${String(bm.getMonth() + 1).padStart(2, "0")}`;
    const invCode = `INV-${ym}-C001-01`;
    const inv = await invoice(invCode, grey.id, {
      invoiceDate: dayInMonth(m, 1),
      billingMonth: bm,
      chargeType: "Monthly Subscription",
      description: "Monthly website subscription",
      dueDate: dayInMonth(m, 1),
      amount: 20,
      discount: 0,
      reminderStatus: "Not Sent",
    });
    await payment(`PAY-${ym}01-001`, grey.id, inv.id, {
      paymentDate: dayInMonth(m, 1), // on the due date → "Paid On Time"
      amount: 20,
      method: "Whish",
      reference: `whish-${ym}`,
      receivedBy: "Aneel",
      depositStatus: m === 0 ? "Not Deposited" : "Deposited",
      depositDate: m === 0 ? null : dayInMonth(m, 5),
    });
  }

  await prisma.expense.upsert({
    where: { code: "EXP-" + `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}` + "-001" },
    update: {},
    create: {
      code: "EXP-" + `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}` + "-001",
      expenseDate: dayInMonth(0, 2),
      expenseMonth: firstOfMonth(0),
      vendor: "Namecheap",
      category: "Domain",
      clientId: grey.id,
      description: "greyclinics.com domain renewal",
      amount: 12,
      method: "Card",
      recurring: true,
      renewalFrequency: "Yearly",
      nextRenewalDate: addDays(48),
      reimbursable: false,
      reimbursementStatus: "Not Applicable",
    },
  });

  await prisma.supportTicket.upsert({
    where: { code: "TKT-" + `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}` + "-001" },
    update: {},
    create: {
      code: "TKT-" + `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}` + "-001",
      requestedDate: addDays(-6),
      requestSource: "WhatsApp",
      clientId: grey.id,
      category: "Content Change",
      summary: "Update clinic opening hours and add new doctor bio",
      priority: "Urgent",
      status: "In Progress",
      assignedTo: "Aneel",
      dueDate: addDays(1),
      hoursSpent: 1.5,
      includedInSubscription: true,
    },
  });

  // ===== C002 — placeholder (delete once you add real clients) =====
  const salon = await client("C002", {
    businessName: "[Sample] Cedar Salon",
    contactName: "Placeholder — safe to delete",
    phone: "+961 3 000 002",
    city: "Jounieh",
    subscriptionStartDate: firstOfMonth(-3),
    billingDay: 5,
    monthlyFee: 35,
    servicePlan: "Standard",
    status: "Active",
    paymentMethod: "Cash",
    notes: "Placeholder client so the dashboard shows filters, alerts and an overdue invoice. Delete anytime.",
  });
  await website("WEB-C002-01", salon.id, {
    projectName: "Cedar Salon Booking Site",
    primaryUrl: "https://cedarsalon.example",
    status: "Live",
    launchDate: firstOfMonth(-3),
    domainName: "cedarsalon.example",
    domainProvider: "GoDaddy",
    domainOwner: "Client",
    domainRenewalDate: addDays(22), // Due in 30 Days
    sslExpiryDate: addDays(-8), // Expired
    hostingProvider: "Cloudflare",
    hostingOwner: "Me",
    hostingRenewalDate: addDays(200),
  });
  // Current month invoice — left unpaid so it shows as Overdue (billing day passed).
  {
    const bm = firstOfMonth(0);
    const ym = `${bm.getFullYear()}${String(bm.getMonth() + 1).padStart(2, "0")}`;
    await invoice(`INV-${ym}-C002-01`, salon.id, {
      invoiceDate: dayInMonth(0, 5),
      billingMonth: bm,
      chargeType: "Monthly Subscription",
      description: "Monthly website subscription",
      dueDate: dayInMonth(0, 5),
      amount: 35,
      discount: 0,
      reminderStatus: "Not Sent",
    });
  }

  // ===== C003 — placeholder trial =====
  const cafe = await client("C003", {
    businessName: "[Sample] Bean Avenue Café",
    contactName: "Placeholder — safe to delete",
    city: "Beirut",
    billingDay: 1,
    monthlyFee: 0,
    servicePlan: "Custom",
    status: "Trial",
    notes: "Placeholder trial client. Delete anytime.",
  });
  await website("WEB-C003-01", cafe.id, {
    projectName: "Bean Avenue Café Site",
    status: "In Development",
    projectStartDate: addDays(-14),
  });

  // ===== Sales module sample: a salesperson with a login + a lead + an assignment =====
  const salesEmail = "sales@test.local";
  let salesUser = await prisma.user.findUnique({ where: { email: salesEmail } });
  if (!salesUser) {
    salesUser = await prisma.user.create({
      data: { email: salesEmail, name: "Sample Salesperson", role: "SALESPERSON", passwordHash: await hashPassword("salespass1") },
    });
  }
  const sp = await prisma.salesperson.upsert({
    where: { code: "SP001" },
    update: { userId: salesUser.id },
    create: {
      code: "SP001", userId: salesUser.id, fullName: "Sample Salesperson", phone: "+961 76 555 111",
      email: salesEmail, city: "Beirut", startDate: firstOfMonth(-6), status: "Active",
      commissionMethod: "Fixed", commissionAmount: 5, commissionPercent: 25, paymentMethod: "Whish",
      whishNumber: "+961 76 555 111", notes: "Sample salesperson (login sales@test.local / salespass1) — safe to delete.",
    },
  });

  // A lead they're working
  await prisma.lead.upsert({
    where: { code: "LEAD-" + `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}` + "-001" },
    update: {},
    create: {
      code: "LEAD-" + `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}` + "-001",
      salespersonId: sp.id, businessName: "Cedar Bites Diner", contactPerson: "Rami", phone: "+961 71 222 333",
      whatsapp: "+961 71 222 333", instagram: "cedarbites", category: "Restaurant", city: "Beirut",
      source: "Door-to-door", status: "Interested", closeChance: 60, interestedService: "Website + booking",
      proposedMonthly: 25, proposedSetup: 150, nextFollowUpDate: addDays(3), notes: "Wants online menu + reservations.",
    },
  });

  // Assign Grey Clinics (C001) to the salesperson, effective from their start month
  const existingAsg = await prisma.clientAssignment.findFirst({ where: { clientId: grey.id, status: "Active" } });
  if (!existingAsg) {
    const greyWebsite = await prisma.website.findUnique({ where: { code: "WEB-C001-01" } });
    await prisma.clientAssignment.create({
      data: {
        code: "ASG-00001", clientId: grey.id, websiteId: greyWebsite?.id ?? null,
        originalSalespersonId: sp.id, currentSalespersonId: sp.id,
        startDate: firstOfMonth(-5), effectiveBillingMonth: firstOfMonth(-5), status: "Active",
        assignedBy: "seed", notes: "Sample assignment.",
      },
    });
  }

  console.log("✓ Sample data seeded (C001 real + C002/C003 placeholders + SP001 salesperson)");
}

async function main() {
  await seedSettings();
  await seedAdmin();
  // Sample/demo data is for local development only. Skip it in production, or
  // whenever SEED_SAMPLE=false, so a real deployment starts clean.
  const includeSample = process.env.NODE_ENV !== "production" && process.env.SEED_SAMPLE !== "false";
  if (includeSample) await seedSampleData();
  else console.log("✓ Clean start — sample data skipped");
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("\nSeed complete.");
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
