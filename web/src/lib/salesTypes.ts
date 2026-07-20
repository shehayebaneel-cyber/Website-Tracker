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

export interface Assignment {
  id: string; code: string; clientId: string; clientName: string | null; clientCode: string | null;
  websiteId: string | null; websiteCode: string | null;
  originalSalespersonId: string; originalSalespersonName: string | null;
  currentSalespersonId: string; currentSalespersonName: string | null;
  startDate: string; endDate: string | null; effectiveBillingMonth: string; status: string;
  transferReason: string | null; monthlyFee: number | null;
  commissionMethod: string | null; commissionAmount: number | null; commissionPercent: number | null;
}
