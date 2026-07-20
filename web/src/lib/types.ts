export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export interface Client {
  id: string;
  code: string;
  businessName: string;
  contactName: string | null;
  phone: string | null;
  website: string | null;
  city: string | null;
  subscriptionStartDate: string | null;
  billingDay: number | null;
  monthlyFee: number;
  servicePlan: string | null;
  status: string;
  pauseDate: string | null;
  cancellationDate: string | null;
  paymentMethod: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  // derived (present on list + detail)
  lifetimeBilled?: number;
  totalPaid?: number;
  outstanding?: number;
  lastPaymentDate?: string | null;
  paidThrough?: string | null;
  nextDueDate?: string | null;
  nextDueInDays?: number | null;
  websiteCount?: number;
  activeWebsiteCount?: number;
  openTicketCount?: number;
}

export interface Website {
  id: string;
  code: string;
  clientId: string;
  clientName?: string;
  clientCode?: string;
  projectName: string | null;
  primaryUrl: string | null;
  status: string;
  projectStartDate: string | null;
  launchDate: string | null;
  notes: string | null;
  domainName: string | null;
  domainProvider: string | null;
  domainOwner: string | null;
  domainCost: number | null;
  domainPurchaseDate: string | null;
  domainRenewalDate: string | null;
  domainAutoRenew: boolean;
  domainDaysRemaining: number | null;
  domainStatus: string;
  hostingProvider: string | null;
  hostingOwner: string | null;
  hostingPlan: string | null;
  hostingCost: number | null;
  hostingRenewalDate: string | null;
  hostingAutoRenew: boolean;
  hostingDaysRemaining: number | null;
  hostingStatus: string;
  sslExpiryDate: string | null;
  sslDaysRemaining: number | null;
  sslStatus: string;
  repositoryUrl: string | null;
  deploymentPlatform: string | null;
  adminUrl: string | null;
  analyticsInstalled: boolean;
  searchConsoleInstalled: boolean;
  lastBackupDate: string | null;
  lastWebsiteUpdate: string | null;
  credentialLocation: string | null;
  techNotes: string | null;
}

export interface Invoice {
  id: string;
  code: string;
  clientId: string;
  clientName?: string;
  clientCode?: string;
  invoiceDate: string;
  billingMonth: string;
  chargeType: string;
  description: string | null;
  dueDate: string;
  amount: number;
  discount: number;
  amountDue: number;
  amountPaid: number;
  balance: number;
  lastPaymentDate: string | null;
  status: string;
  daysLate: number;
  reminderStatus: string;
}

export interface Payment {
  id: string;
  code: string;
  paymentDate: string;
  invoiceId: string | null;
  invoiceCode: string | null;
  clientId: string;
  clientName?: string;
  billingMonth: string | null;
  amount: number;
  method: string;
  reference: string | null;
  receivedBy: string | null;
  depositStatus: string;
  depositDate: string | null;
  notes: string | null;
}

export interface Expense {
  id: string;
  code: string;
  expenseDate: string;
  expenseMonth: string;
  vendor: string | null;
  category: string;
  clientId: string | null;
  websiteId: string | null;
  description: string | null;
  amount: number;
  method: string | null;
  recurring: boolean;
  renewalFrequency: string | null;
  nextRenewalDate: string | null;
  nextRenewalDays: number | null;
  nextRenewalStatus: string;
  reimbursable: boolean;
  reimbursementStatus: string;
  receiptUrl: string | null;
  notes: string | null;
}

export interface Ticket {
  id: string;
  code: string;
  requestedDate: string;
  requestSource: string | null;
  clientId: string;
  clientName?: string;
  websiteId: string | null;
  category: string;
  summary: string;
  priority: string;
  status: string;
  assignedTo: string | null;
  dueDate: string | null;
  completedDate: string | null;
  hoursSpent: number;
  includedInSubscription: boolean;
  extraCharge: number;
  clientApproved: boolean;
  invoiceId: string | null;
  invoiceCode: string | null;
  requestLink: string | null;
  notes: string | null;
  daysOpen: number;
  deadlineStatus: string;
  unbilledExtraWork: boolean;
  clientCode?: string | null;
  // public "Client Support" intake (from the website)
  fromWebsite?: boolean;
  unlinked?: boolean;
  requestType?: string | null;
  requesterName?: string | null;
  requesterEmail?: string | null;
  requesterPhone?: string | null;
  requesterBusiness?: string | null;
  requesterWebsite?: string | null;
  pageUrl?: string | null;
  deviceInfo?: string | null;
  browserInfo?: string | null;
  problemStarted?: string | null;
  frequency?: string | null;
  stepsToReproduce?: string | null;
  businessImpact?: string | null;
  files?: { name: string; url: string; size: number; type: string }[];
}

export interface DashboardData {
  month: string;
  cards: {
    activeClients: number;
    monthlyRecurringRevenue: number;
    subscriptionBilled: number;
    subscriptionPaid: number;
    subscriptionOutstanding: number;
    collectionRate: number | null;
    cashReceived: number;
    expenses: number;
    netCashFlow: number;
    totalOverdue: number;
    openTickets: number;
    renewalsDue60: number;
    undepositedPayments: number;
  };
  series: {
    month: string;
    subscriptionBilled: number;
    subscriptionPaid: number;
    cashReceived: number;
    expenses: number;
    netCashFlow: number;
  }[];
  breakdowns: {
    paymentStatusBreakdown: { name: string; value: number }[];
    ticketStatusBreakdown: { name: string; value: number }[];
    clientsByPlan: { name: string; value: number }[];
    websitesByStatus: { name: string; value: number }[];
  };
  lists: {
    overdueInvoices: any[];
    unpaidSubscriptions: any[];
    domainsExpiring: any[];
    hostingExpiring: any[];
    sslExpiring: any[];
    recurringExpensesSoon: any[];
    urgentTickets: any[];
    recentPayments: any[];
  };
}

export type OptionMap = Record<string, string[]>;
