export interface SalespersonSummary {
  totalLeads: number; activeLeads: number; leadsWon: number;
  totalClientsBrought: number; currentAssignedClients: number; activePayingWebsites: number;
  unpaidClients: number; followUpsDue: number; followUpsOverdue: number;
  estimatedMonthlyCommission: number; commissionApproved: number; commissionPaid: number;
  commissionOnHold: number; lifetimeCommissionPaid: number; retentionRate: number | null;
}

export interface Salesperson {
  id: string; code: string; userId: string | null; fullName: string; photoUrl: string | null;
  phone: string | null; email: string | null; city: string | null; startDate: string | null; endDate: string | null;
  status: string; commissionMethod: string; commissionAmount: number; commissionPercent: number;
  paymentMethod: string | null; whishNumber: string | null; bankInfo: string | null;
  agreementUrl: string | null; agreementSignedDate: string | null; departureReason: string | null;
  notes: string | null; hasLogin: boolean; summary?: SalespersonSummary;
}

export interface Lead {
  id: string; code: string; salespersonId: string; salespersonName: string | null;
  businessName: string; contactPerson: string | null; phone: string | null; whatsapp: string | null;
  email: string | null; instagram: string | null; category: string | null; city: string | null;
  existingWebsite: string | null; source: string | null; dateAdded: string; lastContactDate: string | null;
  nextFollowUpDate: string | null; interestedService: string | null; proposedMonthly: number | null;
  proposedSetup: number | null; status: string; closeChance: number | null; lostReason: string | null;
  notes: string | null; convertedClientId: string | null;
}

export interface LeadActivity { id: string; type: string; summary: string; user: string | null; createdAt: string }

export interface Commission {
  id: string; code: string;
  websiteId: string; websiteCode: string | null; websiteName: string | null;
  clientId: string; clientName: string | null; clientCode: string | null;
  salespersonId: string; salespersonName: string | null; salespersonCode: string | null;
  billingMonth: string; month: string;
  basis: string; method: string;
  subscriptionAmount: number; amount: number; adjustment: number;
  status: string; statusReason: string | null;
  approvedAt: string | null; approvedBy: string | null; heldReason: string | null;
  payoutId: string | null; createdAt: string;
}

export interface CommissionSummary {
  count: number; expected: number; eligible: number; approved: number;
  paid: number; underReview: number; held: number; waiting: number;
}

export interface FollowUp {
  id: string; clientId: string; salespersonId: string; month: string;
  contactedDate: string | null; method: string | null; satisfaction: string | null;
  needsUpdate: boolean; hasTechnicalIssue: boolean; mayCancel: boolean; upsellOpportunity: boolean;
  upsellNote: string | null; notes: string | null; status: string; createdBy: string | null; createdAt: string;
}

export interface FollowUpRow {
  clientId: string; clientCode: string; businessName: string; phone: string | null;
  salespersonId: string; salespersonName: string; month: string;
  followUp: FollowUp | null; dueStatus: string; atRisk: boolean;
}

export interface FollowUpSummary { total: number; done: number; due: number; overdue: number; atRisk: number }

export interface Assignment {
  id: string; code: string; clientId: string; clientName: string | null; clientCode: string | null;
  websiteId: string | null; websiteCode: string | null;
  originalSalespersonId: string; originalSalespersonName: string | null;
  currentSalespersonId: string; currentSalespersonName: string | null;
  startDate: string; endDate: string | null; effectiveBillingMonth: string; status: string;
  transferReason: string | null; monthlyFee: number | null;
  commissionMethod: string | null; commissionAmount: number | null; commissionPercent: number | null;
}
