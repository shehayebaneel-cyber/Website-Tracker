// ---------------------------------------------------------------------------
// The IGNIS pricing catalogue — seed defaults only.
//
// Everything here is EDITABLE from the admin console once seeded. Treat these
// as starting values, not as the source of truth: the database is. Re-seeding
// upserts by `key`, so hand-edits to names, prices and eligibility survive.
//
// The model is additive and the arithmetic is fixed by the spec:
//   base $10 + booking $10 + e-commerce $10 + six packs at $5 = $60 maximum.
// Nothing else may enter the monthly subscription: setup work is one-time, and
// anything paid to another company is an external cost.
// ---------------------------------------------------------------------------

export const BASE = {
  key: "base",
  name: "Base Informational Website",
  heading: "Start with your business website",
  description:
    "A professional website that helps customers discover your business, view your services or products and contact you.",
  ctaLabel: "Start with Informational",
  price: 10,
  priceNote: "/month",
  includedSections: 6,
  monthlyUpdates: 1,
  inclusions: [
    "Professional custom business website",
    "One-page structure",
    "Up to 6 main sections",
    "Mobile, tablet and desktop responsive design",
    "Business information",
    "About section",
    "Services or products presentation",
    "Prices, when the business wants them displayed",
    "Gallery",
    "Contact information",
    "WhatsApp contact button",
    "Contact form or direct contact buttons",
    "Google Maps",
    "Social media links",
    "Business hours",
    "Hosting",
    "SSL certificate",
    "Basic technical maintenance",
    "1 small content update per month",
  ],
};

export interface SeedSystem {
  key: string;
  name: string;
  shortName: string;
  heading: string;
  description: string;
  ctaLabel: string;
  price: number;
  icon: string;
  order: number;
  inclusions: string[];
  limits: {
    key: string;
    label: string;
    unitLabel: string;
    baseValue: number;
    upgradedValue: number;
    helpText?: string;
  }[];
}

export const SYSTEMS: SeedSystem[] = [
  {
    key: "booking",
    name: "Booking System",
    shortName: "Booking",
    heading: "Let customers book appointments",
    description:
      "A complete booking website: customers choose a service, a staff member and a time, and you manage everything from one dashboard.",
    ctaLabel: "Build a Booking Website",
    price: 10,
    icon: "booking",
    order: 0,
    inclusions: [
      "Public booking page",
      "Service selection",
      "Up to 30 active services",
      "Service categories",
      "Service descriptions",
      "Service prices",
      "Service duration",
      "Staff selection",
      "“Any available staff” option",
      "Up to 3 bookable staff members",
      "Staff availability",
      "Business working hours",
      "Available date and time selection",
      "Customer details form",
      "Booking confirmation",
      "Booking calendar",
      "Booking management dashboard",
      "Booking details",
      "Booking status management (pending, confirmed, completed, cancelled, no-show)",
      "Rescheduling",
      "Customer cancellation option",
      "Basic booking confirmation message",
      "Basic owner controls",
      "Cash payment option",
      "Wish payment option when available",
    ],
    limits: [
      {
        key: "services",
        label: "Active services",
        unitLabel: "services",
        baseValue: 30,
        upgradedValue: 100,
        helpText: "A service currently published and available for customers to view or book.",
      },
      {
        key: "staff",
        label: "Bookable staff",
        unitLabel: "staff members",
        baseValue: 3,
        upgradedValue: 10,
        helpText: "A staff member customers can select during the booking process.",
      },
    ],
  },
  {
    key: "store",
    name: "E-commerce System",
    shortName: "E-commerce",
    heading: "Let customers order or buy online",
    description:
      "A working online store or ordering website: a product catalogue, cart, checkout and an order dashboard you manage day to day.",
    ctaLabel: "Build an Online Store",
    price: 10,
    icon: "store",
    order: 1,
    inclusions: [
      "Product catalogue",
      "Up to 50 active products",
      "Product categories",
      "Product pages",
      "Product names",
      "Product descriptions",
      "Product images",
      "Product prices",
      "Simple product variations (size, colour or flavour)",
      "Search",
      "Basic category filters",
      "Shopping cart",
      "Checkout",
      "Customer details form",
      "Pickup option",
      "Basic order confirmation",
      "Order management dashboard",
      "Order details",
      "Order status management (pending, confirmed, preparing, ready, completed, cancelled)",
      "Manual available or unavailable product status",
      "Cash payment option",
      "Wish payment option when available",
    ],
    limits: [
      {
        key: "products",
        label: "Active products",
        unitLabel: "products",
        baseValue: 50,
        upgradedValue: 250,
        helpText:
          "A product currently published on the website. Archived or deleted products do not count.",
      },
    ],
  },
];

export interface SeedPack {
  key: string;
  name: string;
  blurb: string;
  description: string;
  price: number;
  icon: string;
  requiresSystems: string[];
  compatibleSystems: string[];
  requiresReason?: string;
  raisesLimits?: boolean;
  recommendedFor: string[];
  order: number;
  features: string[];
}

export const PACKS: SeedPack[] = [
  {
    key: "capacity-scale",
    name: "Capacity & Scale",
    blurb: "Raise the limits of every system you have, with one pack.",
    description:
      "Increases the standard allowances of the systems you selected. One pack lifts services, bookable staff and products together — you are never charged separately for each.",
    price: 5,
    icon: "bolt",
    requiresSystems: [],
    compatibleSystems: [],
    raisesLimits: true,
    recommendedFor: ["retail-store", "restaurant-cafe", "supplier"],
    order: 0,
    features: [
      "Active services from 30 to up to 100",
      "Bookable staff from 3 to up to 10",
      "Active products from 50 to up to 250",
      "More service categories",
      "More product categories",
      "More product variations and options",
      "More availability configurations",
      "More staff schedules",
      "Higher booking capacity",
      "Larger catalogue capacity",
    ],
  },
  {
    key: "customers-loyalty",
    name: "Customers & Loyalty",
    blurb: "Accounts, history, loyalty, gift cards and reviews in one pack.",
    description:
      "Everything that brings a customer back: they get an account and their history, you get loyalty, rewards, gift cards and reviews. Customer accounts, loyalty and gift cards are never sold separately.",
    price: 5,
    icon: "customers",
    requiresSystems: [],
    compatibleSystems: [],
    recommendedFor: ["salon-beauty", "restaurant-cafe", "retail-store", "sports-facility"],
    order: 1,
    features: [
      "Customer registration",
      "Customer login",
      "Customer profiles",
      "Saved personal details",
      "Saved addresses",
      "Favourites",
      "Booking history",
      "Order history",
      "Loyalty points",
      "Rewards",
      "Birthday rewards",
      "Promo codes",
      "Digital gift cards",
      "Gift-card balance",
      "Gift-card redemption history",
      "Customer reviews",
      "Review history",
      "Basic membership options",
      "Customer notes",
      "Saved preferences",
    ],
  },
  {
    key: "staff-operations",
    name: "Staff & Operations",
    blurb: "Staff logins, roles, schedules, attendance and commissions.",
    description:
      "Internal staff management. Bookable staff profiles are already part of the Booking System — this pack is for employees who log in and work inside the system.",
    price: 5,
    icon: "staff",
    requiresSystems: [],
    compatibleSystems: [],
    recommendedFor: ["salon-beauty", "clinic-healthcare", "restaurant-cafe"],
    order: 2,
    features: [
      "Staff accounts",
      "Staff login",
      "Roles",
      "Permissions",
      "Staff schedules",
      "Staff working hours",
      "Assigned tasks",
      "Staff activity",
      "Employee attendance",
      "Clock-in and clock-out when applicable",
      "Staff commissions",
      "Staff performance information",
      "Internal staff notes",
      "Basic queue management",
      "Owner controls",
      "Permission-based dashboard access",
    ],
  },
  {
    key: "inventory-suppliers",
    name: "Inventory & Suppliers",
    blurb: "Stock levels, movements, suppliers and low-stock alerts.",
    description:
      "Manages real stock quantities, suppliers and movements. Basic product availability stays included with the E-commerce System — this pack is for businesses tracking actual inventory.",
    price: 5,
    icon: "inventory",
    requiresSystems: ["store"],
    compatibleSystems: ["store"],
    requiresReason:
      "Inventory & Suppliers requires an E-commerce or ordering system, because it tracks the stock behind your products.",
    recommendedFor: ["restaurant-cafe", "retail-store", "supplier"],
    order: 3,
    features: [
      "Current stock levels",
      "Product stock",
      "Ingredient stock",
      "Recipes",
      "Product ingredients",
      "Automatic stock deductions",
      "Manual stock adjustments",
      "Stock movements",
      "Stock receiving",
      "Supplier records",
      "Supplier contact details",
      "Purchase records",
      "Invoice references",
      "Low-stock alerts",
      "Damaged stock",
      "Wasted stock",
      "Returned stock",
      "Basic inventory reports",
      "Stock history",
    ],
  },
  {
    key: "delivery-tracking",
    name: "Delivery & Tracking",
    blurb: "Delivery areas, fees, drivers and customer order tracking.",
    description:
      "One complete delivery pack: zones and fees, driver accounts and assignment, delivery statuses and a customer tracking page. Delivery status tracking, not live GPS.",
    price: 5,
    icon: "delivery",
    requiresSystems: ["store"],
    compatibleSystems: ["store"],
    requiresReason:
      "Delivery & Tracking requires E-commerce because it manages product orders and deliveries.",
    recommendedFor: ["restaurant-cafe", "retail-store"],
    order: 4,
    features: [
      "Delivery option during checkout",
      "Pickup option",
      "Delivery areas",
      "Delivery zones",
      "Delivery fees",
      "Free-delivery rules",
      "Minimum-order rules",
      "Estimated delivery time",
      "Driver accounts",
      "Driver assignment",
      "Delivery-status management (preparing, ready, assigned to driver, out for delivery, delivered, failed)",
      "Customer order-tracking page",
      "Order-status timeline",
      "Customer delivery notifications",
      "Driver contact information",
      "Delivery history",
      "Proof-of-delivery option",
      "Delivery notes",
      "Basic delivery reports",
    ],
  },
  {
    key: "insights-automation",
    name: "Insights & Automation",
    blurb: "Reports, performance insights and automated reminders.",
    description:
      "Advanced reporting and automated communication. Basic booking and order confirmations stay included with their systems — this pack adds the reporting and the reminders around them.",
    price: 5,
    icon: "reports",
    requiresSystems: [],
    compatibleSystems: [],
    recommendedFor: ["salon-beauty", "clinic-healthcare", "restaurant-cafe", "retail-store"],
    order: 5,
    features: [
      "Revenue overview",
      "Revenue by date range",
      "Booking totals",
      "Order totals",
      "Popular services",
      "Popular products",
      "Customer reports",
      "Returning-customer information",
      "Staff performance",
      "Product performance",
      "Service performance",
      "Booking-performance reports",
      "Order-performance reports",
      "Cancellation reports",
      "No-show reports",
      "Date comparisons",
      "Exportable basic reports",
      "Advanced owner dashboard widgets",
      "Appointment reminders",
      "Upcoming-booking reminders",
      "Cancellation notifications",
      "Rescheduling notifications",
      "Order-status notifications",
      "Delivery-status notifications",
      "Low-stock notifications",
      "Birthday messages",
      "Automated email messages",
      "WhatsApp notification options",
    ],
  },
];

// One-time work. `isQuote` means the cost genuinely depends on the job, so no
// price is ever shown for it and nothing is added to a total.
export const ONE_TIME = [
  { key: "additional-pages", name: "Additional pages", description: "Extra designed pages beyond the base website.", category: "website", startingPrice: 25, isQuote: false, order: 0 },
  { key: "additional-sections", name: "Additional sections", description: "Extra sections on your existing pages.", category: "website", startingPrice: 15, isQuote: false, order: 1 },
  { key: "additional-language", name: "Additional language", description: "Setup starts at $50. Translating your content is quoted separately.", category: "website", startingPrice: 50, isQuote: false, order: 2 },
  { key: "blog-news", name: "Blog or news section", description: "A section you can post updates to.", category: "website", startingPrice: 30, isQuote: false, order: 3 },
  { key: "extra-galleries", name: "Extra galleries", description: "Additional image galleries.", category: "website", startingPrice: 20, isQuote: false, order: 4 },
  { key: "additional-forms", name: "Additional forms", description: "Extra enquiry or request forms.", category: "website", startingPrice: 15, isQuote: false, order: 5 },
  { key: "seo-setup", name: "Search-engine optimization", description: "Initial on-page SEO setup.", category: "website", startingPrice: 60, isQuote: false, order: 6 },
  { key: "copywriting", name: "Copywriting", description: "We write your website text.", category: "content", startingPrice: 30, isQuote: false, order: 7 },
  { key: "photography", name: "Photography", description: "Photos of your business, products or space.", category: "content", startingPrice: 75, isQuote: false, order: 8 },
  { key: "logo-design", name: "Logo design", description: "A logo designed for your business.", category: "content", startingPrice: 60, isQuote: false, order: 9 },
  { key: "brand-identity", name: "Brand identity", description: "Colours, fonts and brand basics.", category: "content", startingPrice: 120, isQuote: false, order: 10 },
  { key: "product-entry", name: "Initial product entry", description: "Quoted on the number of products and the quality of the source data.", category: "data", startingPrice: null, isQuote: true, order: 11 },
  { key: "service-entry", name: "Initial service entry", description: "Quoted on the number of services.", category: "data", startingPrice: null, isQuote: true, order: 12 },
  { key: "data-migration", name: "Data migration", description: "Moving existing data into your new system.", category: "data", startingPrice: null, isQuote: true, order: 13 },
  { key: "customer-import", name: "Initial customer import", description: "Importing your existing customer list.", category: "data", startingPrice: null, isQuote: true, order: 14 },
  { key: "booking-import", name: "Initial booking import", description: "Importing existing bookings.", category: "data", startingPrice: null, isQuote: true, order: 15 },
  { key: "major-redesign", name: "Major redesign", description: "Rebuilding the layout or structure of the website.", category: "custom", startingPrice: null, isQuote: true, order: 16 },
  { key: "pos-setup", name: "POS setup", description: "Point-of-sale setup and configuration.", category: "custom", startingPrice: null, isQuote: true, order: 17 },
  { key: "kitchen-display-setup", name: "Kitchen display setup", description: "Kitchen display configuration for order flow.", category: "custom", startingPrice: null, isQuote: true, order: 18 },
  { key: "special-dashboard", name: "Special dashboard setup", description: "A dashboard built around how you work.", category: "custom", startingPrice: null, isQuote: true, order: 19 },
  { key: "custom-workflow", name: "Custom workflow development", description: "Business logic built specifically for you.", category: "custom", startingPrice: null, isQuote: true, order: 20 },
  { key: "custom-integration", name: "Custom integration development", description: "Connecting your website to another system.", category: "custom", startingPrice: null, isQuote: true, order: 21 },
];

export const EXTERNAL_COSTS = [
  { key: "domain", name: "Domain registration and renewal", description: "Registered in your name, priced by the registrar.", provider: "Domain registrar", costType: "fixed", order: 0 },
  { key: "business-email", name: "Business email", description: "Mailboxes on your own domain.", provider: "Email provider", costType: "fixed", order: 1 },
  { key: "gateway-fees", name: "Payment gateway fees", description: "A transaction fee on each online payment.", provider: "Payment provider", costType: "usage", order: 2 },
  { key: "sms", name: "SMS usage", description: "Charged per message sent.", provider: "SMS provider", costType: "usage", order: 3 },
  { key: "whatsapp-api", name: "WhatsApp API charges", description: "Charged per conversation by the provider.", provider: "Meta or provider", costType: "usage", order: 4 },
  { key: "third-party-software", name: "Premium third-party software", description: "Any paid tool your setup depends on.", provider: "Software vendor", costType: "fixed", order: 5 },
  { key: "external-api", name: "External API charges", description: "Third-party services your website calls.", provider: "API provider", costType: "usage", order: 6 },
  { key: "cloud-storage", name: "Additional cloud storage", description: "Beyond what your website normally uses.", provider: "Cloud provider", costType: "estimated", order: 7 },
  { key: "maps", name: "Map or location-provider charges", description: "Map usage beyond free provider limits.", provider: "Map provider", costType: "usage", order: 8 },
  { key: "external-delivery", name: "External delivery providers", description: "Third-party delivery companies you use.", provider: "Delivery company", costType: "usage", order: 9 },
];

// Free text per column so a cell can say "Requires E-commerce" or "Display
// only" rather than a misleading tick.
export const COMPARISON = [
  { label: "Base business website", informational: "Included", booking: "Included", store: "Included", both: "Included", order: 0 },
  { label: "Starting monthly price", informational: "$10", booking: "$20", store: "$20", both: "$30", order: 1 },
  { label: "Online booking", informational: "Not available", booking: "Included", store: "Not available", both: "Included", order: 2 },
  { label: "Online store", informational: "Not available", booking: "Not available", store: "Included", both: "Included", order: 3 },
  { label: "Services", informational: "Display only", booking: "Up to 30 bookable", store: "Display only", both: "Up to 30 bookable", order: 4 },
  { label: "Products", informational: "Display only", booking: "Display only", store: "Up to 50 active", both: "Up to 50 active", order: 5 },
  { label: "Bookable staff", informational: "Not available", booking: "Up to 3", store: "Not available", both: "Up to 3", order: 6 },
  { label: "Booking dashboard", informational: "Not available", booking: "Included", store: "Not available", both: "Included", order: 7 },
  { label: "Order dashboard", informational: "Not available", booking: "Not available", store: "Included", both: "Included", order: 8 },
  { label: "Feature packs", informational: "Not available", booking: "Compatible packs", store: "Compatible packs", both: "All compatible packs", order: 9 },
  { label: "Maximum standard total", informational: "$10", booking: "Depends on packs", store: "Depends on packs", both: "Up to $60", order: 10 },
];

// Worked examples. Labelled as examples, never as plans — and their totals are
// DERIVED from the systems and packs named here, never typed in.
export const SETUPS = [
  { key: "informational", name: "Informational business", description: "A professional presence, nothing to manage.", systemKeys: [], packKeys: [], icon: "globe", order: 0 },
  { key: "salon", name: "Salon website", description: "Appointments, regulars and a team.", systemKeys: ["booking"], packKeys: ["customers-loyalty", "staff-operations", "insights-automation"], icon: "booking", order: 1 },
  { key: "retail", name: "Online retail store", description: "A catalogue, stock and deliveries.", systemKeys: ["store"], packKeys: ["capacity-scale", "customers-loyalty", "inventory-suppliers", "delivery-tracking"], icon: "store", order: 2 },
  { key: "restaurant", name: "Restaurant ordering website", description: "Orders, kitchen stock and drivers.", systemKeys: ["store"], packKeys: ["staff-operations", "inventory-suppliers", "delivery-tracking", "insights-automation"], icon: "delivery", order: 3 },
  { key: "complete", name: "Complete system", description: "Both systems and every pack.", systemKeys: ["booking", "store"], packKeys: ["capacity-scale", "customers-loyalty", "staff-operations", "inventory-suppliers", "delivery-tracking", "insights-automation"], icon: "sparkle", order: 4 },
];

export const BUSINESS_TYPES = [
  { key: "salon-beauty", name: "Salon or beauty", icon: "booking", recommendedSystems: ["booking"], priorityPacks: ["customers-loyalty", "staff-operations"], order: 0 },
  { key: "clinic-healthcare", name: "Clinic", icon: "shield", recommendedSystems: ["booking"], priorityPacks: ["customers-loyalty", "insights-automation"], order: 1 },
  { key: "restaurant-cafe", name: "Restaurant or café", icon: "delivery", recommendedSystems: ["store"], priorityPacks: ["inventory-suppliers", "delivery-tracking"], order: 2 },
  { key: "retail-store", name: "Retail store", icon: "store", recommendedSystems: ["store"], priorityPacks: ["capacity-scale", "inventory-suppliers"], order: 3 },
  { key: "professional-service", name: "Professional service", icon: "globe", recommendedSystems: ["booking"], priorityPacks: ["insights-automation"], order: 4 },
  { key: "sports-facility", name: "Sports facility", icon: "bolt", recommendedSystems: ["booking"], priorityPacks: ["customers-loyalty", "capacity-scale"], order: 5 },
  { key: "education", name: "Education", icon: "customers", recommendedSystems: ["booking"], priorityPacks: ["customers-loyalty"], order: 6 },
  { key: "supplier", name: "Supplier", icon: "inventory", recommendedSystems: ["store"], priorityPacks: ["capacity-scale", "inventory-suppliers"], order: 7 },
  { key: "other", name: "Other", icon: "sparkle", recommendedSystems: [], priorityPacks: [], order: 8 },
];

export const GLOSSARY = [
  { title: "Small update", body: "A small update includes changing existing text, prices, images, contact details or opening hours. It does not include new pages, redesigns, new systems or major feature development. Unused updates do not roll over, and most are completed within 2 working days." },
  { title: "Active product", body: "A product currently published on the website. Archived or deleted products do not count toward the active product limit." },
  { title: "Active service", body: "A service currently published and available for customers to view or book." },
  { title: "Bookable staff", body: "A staff member customers can select during the booking process. Staff accounts — employees who log in and use the system — are part of the Staff & Operations pack." },
  { title: "One-time service", body: "Work charged once for setup, design, data entry or custom development." },
  { title: "External cost", body: "A charge from another provider, such as a domain, payment gateway, SMS service or third-party platform." },
  { title: "Starting price", body: "The lowest expected price. The final cost may depend on the amount of work or the selected provider." },
];

export const TERMS = [
  "Every customer starts with the $10 base website.",
  "Core systems are charged monthly.",
  "Feature packs are charged monthly.",
  "The listed standard monthly subscription does not exceed $60.",
  "The $60 maximum only covers standard IGNIS systems and packs.",
  "Custom development may require a one-time fee.",
  "Large data-entry work may require a one-time fee.",
  "External provider charges are separate.",
  "Payment-provider transaction fees are separate.",
  "SMS and WhatsApp API usage may be separate.",
  "Major redesigns are not small updates.",
  "Work outside the agreed scope is quoted separately.",
  "Every additional charge is explained and approved before work begins.",
  "The final configuration is reviewed before development starts.",
];

export const FAQS = [
  { question: "Why does every website start at $10?", answer: "Every business needs the same foundation: a professional website, hosting, SSL and maintenance. That foundation is $10/month, and you add only the systems your business actually uses on top of it." },
  { question: "What is included in the $10 website?", answer: "A one-page professional website with up to 6 main sections, your business information, services or products, gallery, contact buttons, WhatsApp, Google Maps, social links and opening hours — plus hosting, SSL, basic maintenance and 1 small content update per month." },
  { question: "Can I add Booking later?", answer: "Yes. Adding the Booking System costs exactly +$10/month whenever you add it, and nothing you already have changes." },
  { question: "Can I add E-commerce later?", answer: "Yes. Adding the E-commerce System costs exactly +$10/month whenever you add it." },
  { question: "Can I use Booking and E-commerce together?", answer: "Yes. Both systems together are +$20/month — exactly the two prices added — and you manage bookings and orders from one dashboard with one login." },
  { question: "What is included in each feature pack?", answer: "Each pack groups everything related to one part of your business, so nothing overlaps and nothing is charged twice. Every pack is $5/month and lists its full contents on the Feature Packs page." },
  { question: "Can I remove a feature pack later?", answer: "Yes. Packs can be removed at the end of a billing month and your website keeps running normally." },
  { question: "What happens if I need more than 250 products?", answer: "Capacity & Scale covers up to 250 active products. Larger catalogues or unusually complex setups may need a one-time setup quotation, but your monthly subscription still stays within the standard $60 maximum." },
  { question: "What counts as a small update?", answer: "Changing existing text, prices, images, contact details or opening hours. New pages, redesigns and new systems are quoted separately." },
  { question: "Are domain costs included?", answer: "No. The domain is registered in your name and charged by the provider. We always tell you the cost before buying anything." },
  { question: "Are payment gateway fees included?", answer: "No. Payment providers charge their own transaction fee on each payment, paid directly to them." },
  { question: "Are WhatsApp or SMS charges included?", answer: "No. SMS usage and WhatsApp API charges are billed by the provider based on how much you send." },
  { question: "What does the $60 maximum include?", answer: "All listed compatible IGNIS systems and standard feature packs can be combined for a maximum standard subscription of $60/month. It does not mean unlimited products, users, branches, storage, custom development or third-party services." },
  { question: "Is custom development included in the $60 maximum?", answer: "No. Custom workflows, integrations and bespoke tools are quoted separately and always approved by you before any work starts." },
  { question: "Are one-time setup fees included?", answer: "No. Setup work such as data entry, photography, copywriting, logo design and migrations is charged once and shown separately from your monthly subscription." },
  { question: "Can I upgrade or reduce my website later?", answer: "Anytime. Add or remove systems and packs as your business changes — the monthly price simply follows what you have." },
  { question: "Do unused monthly updates roll over?", answer: "No. Each month's allowance starts fresh." },
  { question: "What happens if a third-party provider changes its price?", answer: "We tell you as soon as we know. External services are paid to the provider, so we cannot fix their pricing — but you will never be charged more without being told first." },
];

// Editable copy. The apps ask for a key and never hold the sentence.
export const CONTENT = [
  { key: "pricing.heading", label: "Pricing page heading", value: "Build your website your way" },
  { key: "pricing.sub", label: "Pricing page description", value: "Start at $10/month and add only the systems and features your business needs." },
  { key: "pricing.packsNote", label: "Note under the starting options", value: "Add optional feature packs for $5/month each." },
  { key: "pricing.formula", label: "Pricing example line", value: "Base website $10 + selected systems + selected feature packs = your monthly total." },
  { key: "pricing.maxNote", label: "Maximum-price wording", value: "All listed compatible IGNIS systems and standard feature packs can be combined for a maximum standard subscription of $60/month." },
  { key: "packs.heading", label: "Feature Packs page heading", value: "Business Feature Packs" },
  { key: "packs.sub", label: "Feature Packs page description", value: "Complete packs of related tools for $5/month each — never a long list of overlapping features." },
  { key: "builder.heading", label: "Builder heading", value: "Build your website" },
  { key: "builder.estimateNote", label: "Estimate disclaimer", value: "This is an estimate. Your final configuration will be reviewed and approved before development starts." },
  { key: "guide.heading", label: "Questionnaire heading", value: "Help me build my website" },
  { key: "guide.sub", label: "Questionnaire description", value: "Nine short questions. We'll suggest a starting point — and you can change any of it." },

  // One question per core system and per feature pack, so the questionnaire is
  // built from the catalogue rather than from a list in the web app. Add a
  // system or a pack and its question appears; edit the wording here.
  { key: "question.system.booking", label: "Question — Booking", value: "Do customers need to book appointments?" },
  { key: "question.system.store", label: "Question — E-commerce", value: "Do customers need to buy or order products?" },
  { key: "question.pack.capacity-scale", label: "Question — Capacity & Scale", value: "Do you have a large number of products or services?" },
  { key: "question.pack.customers-loyalty", label: "Question — Customers & Loyalty", value: "Do you need customer accounts, loyalty or reviews?" },
  { key: "question.pack.staff-operations", label: "Question — Staff & Operations", value: "Do staff members need their own logins and schedules?" },
  { key: "question.pack.inventory-suppliers", label: "Question — Inventory & Suppliers", value: "Do you manage stock or suppliers?" },
  { key: "question.pack.delivery-tracking", label: "Question — Delivery & Tracking", value: "Do you deliver orders to customers?" },
  { key: "question.pack.insights-automation", label: "Question — Insights & Automation", value: "Do you need reports or automated reminders?" },
];
