// ---------------------------------------------------------------------------
// The IGNIS pricing catalogue — seed defaults only.
//
// Everything here is EDITABLE from the admin console once seeded. Treat these
// as starting values, not as the source of truth: the database is. Re-seeding
// upserts by `key`, so hand-edits to names, prices and eligibility survive.
//
// Price provenance:
//   - Anchored by the spec: plan bases ($10/$20/$30), the capacity table,
//     Customer Accounts $5, Advanced Reports $5, Loyalty $5, Inventory $10
//     (Premium $30 + $10 = the "from $40" in scenario 6), Delivery $10.
//   - Everything else follows the same shape: simple customer-facing feature $3,
//     standard feature $5, operational module $10, heavy module $15, and
//     anything whose cost genuinely depends on the business is "quote".
// ---------------------------------------------------------------------------

export interface SeedPlan {
  key: string;
  name: string;
  heading: string;
  description: string;
  bestFor: string;
  basePrice: number;
  priceIsFrom: boolean;
  ctaLabel: string;
  addOnHint: string;
  coreSystemMode: "none" | "choose-one" | "one-included-both-available";
  bothSystemsPrice: number | null;
  includedSections: number | null;
  includedUpdates: number;
  includedProducts: number | null;
  includedServices: number | null;
  includedStaff: number | null;
  includedLocations: number;
  popular: boolean;
  order: number;
  /** [label, coreSystem|null] */
  inclusions: [string, string | null][];
}

export const PLANS: SeedPlan[] = [
  {
    key: "basic",
    name: "Basic",
    heading: "Build your online presence",
    description:
      "A professional website that helps customers discover your business, view your services and contact you.",
    bestFor: "Businesses that only need a professional online presence.",
    basePrice: 10,
    priceIsFrom: false,
    ctaLabel: "Customize Basic",
    addOnHint:
      "Add more pages, sections, languages and update packages whenever your business needs them.",
    coreSystemMode: "none",
    bothSystemsPrice: null,
    includedSections: 6,
    includedUpdates: 1,
    includedProducts: null,
    includedServices: null,
    includedStaff: null,
    includedLocations: 1,
    popular: false,
    order: 0,
    inclusions: [
      ["One-page business website", null],
      ["Up to 6 website sections", null],
      ["Mobile, tablet and desktop responsive design", null],
      ["Services and prices", null],
      ["Gallery", null],
      ["WhatsApp button", null],
      ["Contact form or contact buttons", null],
      ["Google Maps", null],
      ["Social media links", null],
      ["Hosting and SSL", null],
      ["Basic technical maintenance", null],
      ["1 small content update per month", null],
    ],
  },
  {
    key: "standard",
    name: "Standard",
    heading: "Accept bookings or online orders",
    description:
      "Choose one complete customer system and manage it through your owner dashboard.",
    bestFor: "Businesses that want to receive and manage bookings or online orders.",
    basePrice: 20,
    priceIsFrom: false,
    ctaLabel: "Customize Standard",
    addOnHint:
      "Increase your products, services, staff and monthly updates with optional add-ons.",
    coreSystemMode: "choose-one",
    bothSystemsPrice: null,
    includedSections: null,
    includedUpdates: 3,
    includedProducts: 50,
    includedServices: 30,
    includedStaff: 3,
    includedLocations: 1,
    popular: true,
    order: 1,
    inclusions: [
      ["Everything included in Basic", null],
      // Booking variant
      ["Online booking system", "booking"],
      ["Up to 30 active services", "booking"],
      ["Up to 3 bookable staff members", "booking"],
      ["Availability and schedule management", "booking"],
      ["Booking management dashboard", "booking"],
      ["Customer booking confirmation", "booking"],
      ["Booking status management", "booking"],
      // Store variant
      ["Online store or ordering system", "store"],
      ["Up to 50 active products", "store"],
      ["Product categories", "store"],
      ["Product management", "store"],
      ["Order management dashboard", "store"],
      ["Order status management", "store"],
      // Common
      ["Cash or Wish payment option", null],
      ["3 small content updates per month", null],
    ],
  },
  {
    key: "premium",
    name: "Premium",
    heading: "Run your business with advanced tools",
    description:
      "Start with a complete customer system and add the management tools your business requires.",
    bestFor:
      "Businesses that need a more complete management system, advanced tools or multiple connected features.",
    basePrice: 30,
    priceIsFrom: true,
    ctaLabel: "Build Your Premium System",
    addOnHint:
      "Add the business modules your company needs. Higher or custom limits are available.",
    coreSystemMode: "one-included-both-available",
    bothSystemsPrice: 10,
    includedSections: null,
    includedUpdates: 5,
    includedProducts: 200,
    includedServices: 100,
    includedStaff: 10,
    includedLocations: 1,
    popular: false,
    order: 2,
    inclusions: [
      ["Everything included in Standard", null],
      ["One core system: booking or store", null],
      ["Customer accounts", null],
      ["Advanced owner dashboard", null],
      ["Basic reports", null],
      ["Priority technical support", null],
      ["Owner dashboard training", null],
      ["Up to 5 small content updates per month", null],
      ["Advanced business modules available", null],
      ["Higher or custom limits depending on the business", null],
      ["Custom workflows available by quotation", null],
    ],
  },
];

export const CATEGORIES = [
  { key: "customers-marketing", name: "Customers and marketing", blurb: "Bring customers back and keep them engaged.", icon: "customers", order: 0 },
  { key: "staff-operations", name: "Staff and operations", blurb: "Run your team and day-to-day operations.", icon: "staff", order: 1 },
  { key: "products-inventory", name: "Products and inventory", blurb: "Track stock, suppliers and product data.", icon: "inventory", order: 2 },
  { key: "orders-delivery", name: "Orders and delivery", blurb: "Fulfil, deliver and manage orders.", icon: "delivery", order: 3 },
  { key: "reports-admin", name: "Reports and administration", blurb: "Understand performance and manage your system.", icon: "reports", order: 4 },
  { key: "website-extras", name: "Website extras", blurb: "Grow and improve the website itself.", icon: "globe", order: 5 },
];

export interface SeedAddOn {
  key: string;
  category: string;
  name: string;
  blurb: string;
  bestFor?: string;
  includes: string[];
  pricingType: "monthly" | "onetime" | "quote" | "external" | "bundled";
  price?: number | null;
  priceLabel?: string;
  minPlan: "basic" | "standard" | "premium";
  includedInPlans?: string[];
  bundledWith?: string | null;
  /** [type, key, note?] */
  deps?: ["addon" | "coreSystem", string, string?][];
  recommendedFor?: string[];
  popular?: boolean;
  order: number;
}

const CORE_ANY = "booking|store";

export const ADDONS: SeedAddOn[] = [
  // ---------------------------------------------------------------- customers
  {
    key: "customer-accounts", category: "customers-marketing", name: "Customer Accounts",
    blurb: "Allow customers to create an account, save their details, view favourites and access booking or order history.",
    bestFor: "Businesses with repeat customers.",
    includes: ["Registration and login", "Saved customer details", "Favourites", "Booking or order history"],
    pricingType: "monthly", price: 5, minPlan: "standard", includedInPlans: ["premium"],
    deps: [["coreSystem", CORE_ANY, "Customer Accounts needs a booking system or an online store."]],
    recommendedFor: ["salon-beauty", "restaurant-cafe", "retail-store", "sports-facility"], popular: true, order: 0,
  },
  {
    key: "loyalty-rewards", category: "customers-marketing", name: "Loyalty and Rewards",
    blurb: "Points, rewards and birthday offers that bring customers back.",
    bestFor: "Cafés, salons and repeat-visit businesses.",
    includes: ["Customer points", "Rewards and offers", "Redemption history"],
    pricingType: "monthly", price: 5, minPlan: "standard",
    deps: [["addon", "customer-accounts"]],
    recommendedFor: ["salon-beauty", "restaurant-cafe", "retail-store"], popular: true, order: 1,
  },
  {
    key: "gift-cards", category: "customers-marketing", name: "Digital Gift Cards",
    blurb: "Sell and redeem digital gift cards.",
    includes: ["Gift card purchase", "Redemption tracking", "Balance history"],
    pricingType: "monthly", price: 3, minPlan: "standard",
    deps: [["addon", "customer-accounts"]], recommendedFor: ["salon-beauty", "restaurant-cafe"], order: 2,
  },
  {
    key: "customer-reviews", category: "customers-marketing", name: "Customer Reviews",
    blurb: "Collect and display reviews from real customers.",
    includes: ["Review collection", "Moderation", "Display on your website"],
    pricingType: "monthly", price: 3, minPlan: "standard", order: 3,
  },
  {
    key: "promo-codes", category: "customers-marketing", name: "Promo Codes",
    blurb: "Run discounts and promotional campaigns.",
    includes: ["Discount codes", "Usage limits", "Expiry dates"],
    pricingType: "monthly", price: 3, minPlan: "standard",
    deps: [["coreSystem", CORE_ANY]], order: 4,
  },
  {
    key: "memberships", category: "customers-marketing", name: "Memberships",
    blurb: "Paid or tiered memberships with member-only pricing and access.",
    includes: ["Membership tiers", "Member pricing", "Renewals", "Member directory"],
    pricingType: "monthly", price: 10, minPlan: "premium",
    deps: [["addon", "customer-accounts"]], recommendedFor: ["sports-facility", "educational"], order: 5,
  },
  {
    key: "subscriptions", category: "customers-marketing", name: "Subscriptions",
    blurb: "Recurring plans your customers subscribe to.",
    includes: ["Recurring billing cycles", "Subscriber management", "Renewal reminders"],
    pricingType: "monthly", price: 10, minPlan: "premium",
    deps: [["addon", "customer-accounts"]], order: 6,
  },
  {
    key: "saved-favourites", category: "customers-marketing", name: "Saved Favourites",
    blurb: "Customers save the products or services they like.",
    includes: ["Favourite products or services", "Quick re-order"],
    pricingType: "bundled", bundledWith: "customer-accounts", minPlan: "standard", order: 7,
  },
  {
    key: "booking-order-history", category: "customers-marketing", name: "Booking and Order History",
    blurb: "Customers see everything they have booked or ordered before.",
    includes: ["Past bookings", "Past orders", "Re-book or re-order"],
    pricingType: "bundled", bundledWith: "customer-accounts", minPlan: "standard", order: 8,
  },
  {
    key: "birthday-rewards", category: "customers-marketing", name: "Birthday Rewards",
    blurb: "Automatic birthday offers for your customers.",
    includes: ["Birthday capture", "Automatic reward", "Reminder message"],
    pricingType: "monthly", price: 2, minPlan: "standard",
    deps: [["addon", "loyalty-rewards"]], order: 9,
  },
  {
    key: "email-notifications", category: "customers-marketing", name: "Email Notifications",
    blurb: "Automatic confirmation and update emails.",
    includes: ["Booking or order confirmation", "Status updates", "Branded templates"],
    pricingType: "monthly", price: 3, minPlan: "standard", order: 10,
  },
  {
    key: "whatsapp-notifications", category: "customers-marketing", name: "WhatsApp Notifications",
    blurb: "Send confirmations and updates on WhatsApp.",
    includes: ["Booking or order confirmation", "Status updates", "Message templates"],
    pricingType: "monthly", price: 5, minPlan: "standard", popular: true, order: 11,
  },
  {
    key: "sms-reminders", category: "customers-marketing", name: "SMS Reminders",
    blurb: "Text-message reminders before an appointment.",
    bestFor: "Clinics and appointment businesses.",
    includes: ["Appointment reminders", "Custom timing", "Delivery status"],
    pricingType: "monthly", price: 5, minPlan: "standard",
    priceLabel: "From +$5/month · SMS usage billed by the provider",
    deps: [["coreSystem", "booking"]], recommendedFor: ["clinic-healthcare", "salon-beauty"], order: 12,
  },
  {
    key: "marketing-campaigns", category: "customers-marketing", name: "Marketing Campaigns",
    blurb: "Send campaigns and offers to your customer list.",
    includes: ["Customer segments", "Campaign sending", "Basic performance stats"],
    pricingType: "monthly", price: 10, minPlan: "premium",
    deps: [["addon", "customer-accounts"]], order: 13,
  },

  // ------------------------------------------------------------------- staff
  {
    key: "staff-management", category: "staff-operations", name: "Staff Management",
    blurb: "A full internal system for your team — logins, roles, schedules, tasks and activity history.",
    bestFor: "Teams with multiple employees.",
    includes: ["Staff logins", "Roles and permissions", "Schedules", "Assigned tasks", "Activity history"],
    pricingType: "monthly", price: 10, minPlan: "premium",
    recommendedFor: ["salon-beauty", "restaurant-cafe", "clinic-healthcare"], popular: true, order: 0,
  },
  {
    key: "staff-accounts", category: "staff-operations", name: "Staff Accounts",
    blurb: "Give your team their own logins with limited access.",
    includes: ["Individual logins", "Limited dashboard access"],
    pricingType: "monthly", price: 5, minPlan: "standard", order: 1,
  },
  {
    key: "roles-permissions", category: "staff-operations", name: "Roles and Permissions",
    blurb: "Control exactly what each staff member can see and do.",
    includes: ["Role definitions", "Per-section permissions"],
    pricingType: "bundled", bundledWith: "staff-management", minPlan: "premium", order: 2,
  },
  {
    key: "staff-schedules", category: "staff-operations", name: "Staff Schedules",
    blurb: "Working hours, shifts and availability.",
    includes: ["Weekly schedules", "Availability", "Time off"],
    pricingType: "monthly", price: 5, minPlan: "standard", order: 3,
  },
  {
    key: "assigned-tasks", category: "staff-operations", name: "Assigned Tasks",
    blurb: "Assign work to staff and track completion.",
    includes: ["Task assignment", "Due dates", "Completion tracking"],
    pricingType: "monthly", price: 5, minPlan: "premium", order: 4,
  },
  {
    key: "staff-activity", category: "staff-operations", name: "Staff Activity",
    blurb: "A record of what each staff member did in the system.",
    includes: ["Activity history", "Per-staff filtering"],
    pricingType: "bundled", bundledWith: "staff-management", minPlan: "premium", order: 5,
  },
  {
    key: "employee-attendance", category: "staff-operations", name: "Employee Attendance",
    blurb: "Check-in and check-out records for your team.",
    includes: ["Check in and out", "Attendance history", "Basic attendance reports"],
    pricingType: "monthly", price: 5, minPlan: "premium",
    deps: [["addon", "staff-management"]], order: 6,
  },
  {
    key: "staff-commissions", category: "staff-operations", name: "Staff Commissions",
    blurb: "Track commission earned per staff member.",
    includes: ["Commission rules", "Per-staff totals", "Commission history"],
    pricingType: "monthly", price: 5, minPlan: "premium",
    deps: [["addon", "staff-management"]], recommendedFor: ["salon-beauty"], order: 7,
  },
  {
    key: "queue-management", category: "staff-operations", name: "Queue Management",
    blurb: "Manage walk-in queues and waiting customers.",
    includes: ["Live queue", "Estimated wait", "Called-next display"],
    pricingType: "monthly", price: 10, minPlan: "premium",
    recommendedFor: ["clinic-healthcare", "salon-beauty"], order: 8,
  },
  {
    key: "multi-branch", category: "staff-operations", name: "Multi-branch Management",
    blurb: "Run more than one location from a single system.",
    includes: ["Per-branch data", "Branch switching", "Combined reporting"],
    pricingType: "monthly", price: 15, minPlan: "premium", order: 9,
  },
  {
    key: "internal-notifications", category: "staff-operations", name: "Internal Notifications",
    blurb: "Alert your team when something needs attention.",
    includes: ["New booking or order alerts", "Task alerts", "Per-staff preferences"],
    pricingType: "monthly", price: 3, minPlan: "standard", order: 10,
  },

  // --------------------------------------------------------------- inventory
  {
    key: "inventory-management", category: "products-inventory", name: "Inventory Management",
    blurb: "Track stock levels, movements and low-stock alerts across your products and ingredients.",
    bestFor: "Restaurants, cafés, retail and any product business.",
    includes: ["Products and ingredients", "Current stock levels", "Stock movements", "Low-stock alerts"],
    pricingType: "monthly", price: 10, minPlan: "premium",
    deps: [["coreSystem", "store", "Inventory Management needs an online store or ordering system."]],
    recommendedFor: ["restaurant-cafe", "retail-store"], popular: true, order: 0,
  },
  {
    key: "ingredient-stock", category: "products-inventory", name: "Product and Ingredient Stock",
    blurb: "Stock tracking for both finished products and raw ingredients.",
    includes: ["Product stock", "Ingredient stock", "Units and conversions"],
    pricingType: "bundled", bundledWith: "inventory-management", minPlan: "premium", order: 1,
  },
  {
    key: "recipes", category: "products-inventory", name: "Recipes",
    blurb: "Define what each menu item uses so stock deducts automatically.",
    includes: ["Recipe definitions", "Automatic ingredient deduction", "Cost per item"],
    pricingType: "monthly", price: 5, minPlan: "premium",
    deps: [["addon", "inventory-management"]], recommendedFor: ["restaurant-cafe"], order: 2,
  },
  {
    key: "suppliers", category: "products-inventory", name: "Suppliers",
    blurb: "Keep supplier details and link them to your purchases.",
    includes: ["Supplier records", "Contact details", "Supplier per product"],
    pricingType: "monthly", price: 5, minPlan: "premium",
    deps: [["addon", "inventory-management"]], order: 3,
  },
  {
    key: "receiving", category: "products-inventory", name: "Receiving",
    blurb: "Record stock as it arrives.",
    includes: ["Receive stock", "Quantity confirmation", "Receiving history"],
    pricingType: "bundled", bundledWith: "inventory-management", minPlan: "premium", order: 4,
  },
  {
    key: "purchase-records", category: "products-inventory", name: "Purchase Records",
    blurb: "A record of what you bought, from whom and for how much.",
    includes: ["Purchase entries", "Supplier link", "Purchase history"],
    pricingType: "monthly", price: 5, minPlan: "premium",
    deps: [["addon", "inventory-management"]], order: 5,
  },
  {
    key: "stock-movements", category: "products-inventory", name: "Stock Movements",
    blurb: "Every increase and decrease in stock, with the reason.",
    includes: ["Movement log", "Reasons", "Per-product history"],
    pricingType: "bundled", bundledWith: "inventory-management", minPlan: "premium", order: 6,
  },
  {
    key: "low-stock-alerts", category: "products-inventory", name: "Low-stock Alerts",
    blurb: "Know before you run out.",
    includes: ["Per-product thresholds", "Alerts in the dashboard"],
    pricingType: "bundled", bundledWith: "inventory-management", minPlan: "premium", order: 7,
  },
  {
    key: "product-variations", category: "products-inventory", name: "Product Variations",
    blurb: "Sizes, colours and options for the same product.",
    includes: ["Variation options", "Per-variation price", "Per-variation stock"],
    pricingType: "monthly", price: 5, minPlan: "standard",
    deps: [["coreSystem", "store"]], recommendedFor: ["retail-store"], order: 8,
  },
  {
    key: "barcode-support", category: "products-inventory", name: "Barcode Support",
    blurb: "Scan barcodes to find and count products.",
    includes: ["Barcode per product", "Scan to search", "Scan during stock count"],
    pricingType: "monthly", price: 5, minPlan: "premium",
    deps: [["addon", "inventory-management"]], recommendedFor: ["retail-store"], order: 9,
  },
  {
    key: "inventory-reports", category: "products-inventory", name: "Inventory Reports",
    blurb: "Stock value, movement and usage reporting.",
    includes: ["Stock value", "Usage over time", "Low-stock summary"],
    pricingType: "monthly", price: 5, minPlan: "premium",
    deps: [["addon", "inventory-management"]], order: 10,
  },

  // ---------------------------------------------------------------- delivery
  {
    key: "delivery-management", category: "orders-delivery", name: "Delivery Management",
    blurb: "Delivery areas, fees, drivers and order tracking.",
    bestFor: "Restaurants and stores that deliver.",
    includes: ["Delivery areas", "Delivery fees", "Driver assignment", "Order tracking"],
    pricingType: "monthly", price: 10, minPlan: "premium",
    deps: [["coreSystem", "store", "Delivery Management needs an online store or ordering system."]],
    recommendedFor: ["restaurant-cafe", "retail-store"], popular: true, order: 0,
  },
  {
    key: "delivery-areas", category: "orders-delivery", name: "Delivery Areas",
    blurb: "Define exactly where you deliver.",
    includes: ["Area definitions", "Per-area availability"],
    pricingType: "bundled", bundledWith: "delivery-management", minPlan: "premium", order: 1,
  },
  {
    key: "delivery-fees", category: "orders-delivery", name: "Delivery Fees",
    blurb: "Charge different fees per area or order value.",
    includes: ["Per-area fees", "Free-delivery threshold"],
    pricingType: "bundled", bundledWith: "delivery-management", minPlan: "premium", order: 2,
  },
  {
    key: "driver-accounts", category: "orders-delivery", name: "Driver Accounts",
    blurb: "Give drivers their own login to see assigned deliveries.",
    includes: ["Driver logins", "Assigned deliveries", "Delivery confirmation"],
    pricingType: "monthly", price: 5, minPlan: "premium",
    deps: [["addon", "delivery-management"]], order: 3,
  },
  {
    key: "driver-assignment", category: "orders-delivery", name: "Driver Assignment",
    blurb: "Assign each order to a driver.",
    includes: ["Assign to driver", "Delivery status"],
    pricingType: "bundled", bundledWith: "delivery-management", minPlan: "premium", order: 4,
  },
  {
    key: "order-tracking", category: "orders-delivery", name: "Order Tracking",
    blurb: "Customers follow their order status live.",
    includes: ["Status timeline", "Customer tracking link"],
    pricingType: "monthly", price: 5, minPlan: "standard",
    deps: [["coreSystem", "store"]], order: 5,
  },
  {
    key: "pickup-scheduling", category: "orders-delivery", name: "Pickup Scheduling",
    blurb: "Let customers choose a pickup time.",
    includes: ["Pickup slots", "Slot capacity", "Pickup confirmation"],
    pricingType: "monthly", price: 3, minPlan: "standard",
    deps: [["coreSystem", "store"]], order: 6,
  },
  {
    key: "point-of-sale", category: "orders-delivery", name: "Point of Sale",
    blurb: "Take in-person sales through the same system as your online orders.",
    bestFor: "Shops, cafés and counters serving walk-in customers.",
    includes: ["In-person sales screen", "Cash and card recording", "Daily totals", "Receipts"],
    pricingType: "monthly", price: 15, minPlan: "premium",
    recommendedFor: ["retail-store", "restaurant-cafe"], order: 7,
  },
  {
    key: "kitchen-display", category: "orders-delivery", name: "Kitchen Display System",
    blurb: "Orders appear on a kitchen screen as they come in.",
    includes: ["Live order screen", "Preparation status", "Order timing"],
    pricingType: "monthly", price: 10, minPlan: "premium",
    deps: [["coreSystem", "store", "The Kitchen Display System needs an ordering system."]],
    recommendedFor: ["restaurant-cafe"], order: 8,
  },
  {
    key: "order-notifications", category: "orders-delivery", name: "Automated Order Notifications",
    blurb: "Tell customers automatically when their order changes status.",
    includes: ["Status-change messages", "Channel selection", "Message templates"],
    pricingType: "monthly", price: 5, minPlan: "standard",
    deps: [["coreSystem", "store"]], order: 9,
  },
  {
    key: "order-status-management", category: "orders-delivery", name: "Order Status Management",
    blurb: "Move orders through your own workflow stages.",
    includes: ["Status stages", "Bulk updates", "Status history"],
    pricingType: "bundled", bundledWith: null, minPlan: "standard", order: 10,
  },

  // ----------------------------------------------------------------- reports
  {
    key: "advanced-reports", category: "reports-admin", name: "Advanced Reports & Analytics",
    blurb: "Deeper reporting beyond the basic overview — comparisons, performance and exports.",
    bestFor: "Owners who want to understand their numbers in detail.",
    includes: ["Date comparisons", "Detailed performance reports", "Staff and product performance", "Customer behaviour", "Exportable reports", "Advanced dashboard widgets"],
    pricingType: "monthly", price: 5, minPlan: "standard", popular: true, order: 0,
  },
  { key: "revenue-reports", category: "reports-admin", name: "Revenue Reports", blurb: "Revenue over any period, with comparisons.", includes: ["Revenue by period", "Period comparison"], pricingType: "bundled", bundledWith: "advanced-reports", minPlan: "standard", order: 1 },
  { key: "customer-reports", category: "reports-admin", name: "Customer Reports", blurb: "Who your customers are and how often they return.", includes: ["New vs returning", "Top customers"], pricingType: "bundled", bundledWith: "advanced-reports", minPlan: "standard", order: 2 },
  { key: "staff-performance", category: "reports-admin", name: "Staff Performance", blurb: "How each staff member is performing.", includes: ["Bookings or sales per staff", "Comparison over time"], pricingType: "bundled", bundledWith: "advanced-reports", minPlan: "standard", order: 3 },
  { key: "product-performance", category: "reports-admin", name: "Product Performance", blurb: "Your best and slowest products.", includes: ["Top products", "Slow movers"], pricingType: "bundled", bundledWith: "advanced-reports", minPlan: "standard", order: 4 },
  { key: "service-performance", category: "reports-admin", name: "Service Performance", blurb: "Your most and least booked services.", includes: ["Top services", "Booking trends"], pricingType: "bundled", bundledWith: "advanced-reports", minPlan: "standard", order: 5 },
  {
    key: "custom-dashboards", category: "reports-admin", name: "Custom Dashboards",
    blurb: "A dashboard built around the numbers your business actually watches.",
    includes: ["Custom widgets", "Your own layout", "Built to your requirements"],
    pricingType: "quote", minPlan: "premium", order: 6,
  },
  { key: "data-exports", category: "reports-admin", name: "Data Exports", blurb: "Download your data as spreadsheets.", includes: ["CSV export", "Per-section exports"], pricingType: "monthly", price: 3, minPlan: "standard", order: 7 },
  { key: "activity-logs", category: "reports-admin", name: "Activity Logs", blurb: "A record of every change made in your system.", includes: ["Who changed what", "Filter by user or date"], pricingType: "monthly", price: 3, minPlan: "standard", order: 8 },
  {
    key: "custom-admin-tools", category: "reports-admin", name: "Custom Admin Tools",
    blurb: "Tools and workflows built specifically for how your business runs.",
    includes: ["Built to your requirements", "Custom workflows", "Custom screens"],
    pricingType: "quote", minPlan: "premium", order: 9,
  },

  // ---------------------------------------------------------- website extras
  { key: "additional-pages", category: "website-extras", name: "Additional Pages", blurb: "Extra pages beyond what your plan includes.", includes: ["Design and build", "Mobile responsive", "Linked in your menu"], pricingType: "onetime", price: 25, minPlan: "basic", order: 0 },
  { key: "additional-sections", category: "website-extras", name: "Additional Sections", blurb: "Extra sections on an existing page.", includes: ["Design and build", "Mobile responsive"], pricingType: "onetime", price: 15, minPlan: "basic", order: 1 },
  { key: "additional-galleries", category: "website-extras", name: "Additional Galleries", blurb: "More photo galleries for your work.", includes: ["Gallery layout", "Image optimisation"], pricingType: "onetime", price: 20, minPlan: "basic", order: 2 },
  { key: "additional-forms", category: "website-extras", name: "Additional Forms", blurb: "Extra contact or enquiry forms.", includes: ["Custom fields", "Delivery to your inbox or WhatsApp"], pricingType: "onetime", price: 15, minPlan: "basic", order: 3 },
  { key: "additional-languages", category: "website-extras", name: "Additional Languages", blurb: "Publish your website in another language.", includes: ["Language switcher", "Translated layout setup"], priceLabel: "From $50 one-time · translation of content quoted separately", pricingType: "onetime", price: 50, minPlan: "basic", order: 4 },
  { key: "blog-news", category: "website-extras", name: "Blog or News", blurb: "Publish articles, offers and announcements.", includes: ["Article publishing", "Categories", "Listing page"], pricingType: "monthly", price: 3, minPlan: "basic", order: 5 },
  { key: "advanced-forms", category: "website-extras", name: "Advanced Forms", blurb: "Multi-step or conditional forms.", includes: ["Multi-step flow", "Conditional questions", "File uploads"], pricingType: "monthly", price: 3, minPlan: "basic", order: 6 },
  { key: "seo", category: "website-extras", name: "Search Engine Optimization", blurb: "Ongoing work to help customers find you on Google.", includes: ["Keyword setup", "Page optimisation", "Monthly adjustments"], pricingType: "monthly", price: 10, minPlan: "basic", order: 7 },
  { key: "copywriting", category: "website-extras", name: "Copywriting", blurb: "We write your website text for you.", includes: ["Section text", "Service descriptions", "One revision round"], pricingType: "onetime", price: 30, minPlan: "basic", order: 8 },
  { key: "photography", category: "website-extras", name: "Photography", blurb: "Professional photos of your business, products or space.", includes: ["On-site session", "Edited images", "Web-optimised files"], pricingType: "onetime", price: 75, minPlan: "basic", order: 9 },
  { key: "logo-branding", category: "website-extras", name: "Logo and Branding", blurb: "A logo and basic brand identity for your business.", includes: ["Logo design", "Colour and font selection", "Files for web and print"], pricingType: "onetime", price: 60, minPlan: "basic", order: 10 },
  { key: "product-data-entry", category: "website-extras", name: "Product Data Entry", blurb: "We enter your products so you don't have to.", includes: ["Product names and prices", "Categories", "Images where provided"], priceLabel: "From $20 one-time", pricingType: "onetime", price: 20, minPlan: "basic", order: 11 },
  { key: "service-data-entry", category: "website-extras", name: "Service Data Entry", blurb: "We enter your services and prices for you.", includes: ["Service names and prices", "Durations", "Categories"], pricingType: "onetime", price: 15, minPlan: "basic", order: 12 },
  { key: "data-migration", category: "website-extras", name: "Data Migration", blurb: "Move your existing data across from another system.", includes: ["Data review", "Mapping and import", "Verification"], pricingType: "quote", minPlan: "basic", order: 13 },
];

export const CAPACITY = [
  { key: "products", name: "Active products", unitLabel: "products", stepSize: 50, pricePerStep: 5, maxSteps: 10, appliesToPlans: ["standard", "premium"], requiresCoreSystem: "store", helpText: "A product currently published and available in your store. Archived products do not count.", order: 0 },
  { key: "services", name: "Active services", unitLabel: "services", stepSize: 10, pricePerStep: 2, maxSteps: 20, appliesToPlans: ["standard", "premium"], requiresCoreSystem: "booking", helpText: "A service currently published and available for customers to view or book.", order: 1 },
  { key: "staff", name: "Bookable staff", unitLabel: "staff members", stepSize: 1, pricePerStep: 2, maxSteps: 30, appliesToPlans: ["standard", "premium"], requiresCoreSystem: "booking", helpText: "A staff member customers can select when making a booking.", order: 2 },
  { key: "updates", name: "Monthly content updates", unitLabel: "updates", stepSize: 2, pricePerStep: 3, maxSteps: 10, appliesToPlans: ["basic", "standard", "premium"], requiresCoreSystem: null, helpText: "Small updates included each month. See the glossary for what counts as a small update.", order: 3 },
  { key: "locations", name: "Business locations", unitLabel: "locations", stepSize: 1, pricePerStep: 10, maxSteps: 20, appliesToPlans: ["premium"], requiresCoreSystem: null, helpText: "Each additional branch managed from the same system.", order: 4 },
];

export const COMPARISON = [
  { label: "Website structure", basic: "Up to 6 sections", standard: "Multi-page", premium: "Custom structure", order: 0 },
  { label: "Monthly small updates", basic: "1", standard: "3", premium: "Up to 5", note: "A small update changes existing text, prices, images, contact details or opening hours.", order: 1 },
  { label: "Booking or store", basic: "Not available", standard: "Choose one", premium: "One included; both available", order: 2 },
  { label: "Active services", basic: "Not available", standard: "Up to 30 with booking", premium: "Custom or expandable", order: 3 },
  { label: "Active products", basic: "Not available", standard: "Up to 50 with store", premium: "Custom or expandable", order: 4 },
  { label: "Bookable staff", basic: "Not available", standard: "Up to 3 with booking", premium: "Expandable", order: 5 },
  { label: "Customer accounts", basic: "Not available", standard: "Optional add-on", premium: "Included", order: 6 },
  { label: "Basic reports", basic: "Not available", standard: "Optional", premium: "Included", order: 7 },
  { label: "Advanced analytics", basic: "Not available", standard: "Optional add-on", premium: "Optional add-on", order: 8 },
  { label: "Inventory", basic: "Not available", standard: "Premium required", premium: "Optional module", order: 9 },
  { label: "Delivery management", basic: "Not available", standard: "Premium required", premium: "Optional module", order: 10 },
  { label: "Staff management", basic: "Not available", standard: "Limited or optional", premium: "Advanced module", order: 11 },
  { label: "Priority support", basic: "Not included", standard: "Not included", premium: "Included", order: 12 },
  { label: "Owner training", basic: "Not included", standard: "Basic guidance", premium: "Included", order: 13 },
  { label: "Custom integrations", basic: "Not available", standard: "Limited", premium: "Available by quotation", order: 14 },
];

export const BUSINESS_TYPES = [
  { key: "salon-beauty", name: "Salon or beauty business", icon: "sparkle", recommendedPlan: "standard", recommendedCore: "booking", priorityCategories: ["customers-marketing", "staff-operations"], priorityAddOns: ["customer-accounts", "loyalty-rewards", "staff-management", "sms-reminders"], order: 0 },
  { key: "clinic-healthcare", name: "Clinic or healthcare service", icon: "shield", recommendedPlan: "standard", recommendedCore: "booking", priorityCategories: ["customers-marketing", "staff-operations"], priorityAddOns: ["sms-reminders", "customer-accounts", "queue-management"], order: 1 },
  { key: "restaurant-cafe", name: "Restaurant or café", icon: "booking", recommendedPlan: "premium", recommendedCore: "store", priorityCategories: ["orders-delivery", "products-inventory"], priorityAddOns: ["delivery-management", "inventory-management", "kitchen-display", "point-of-sale"], order: 2 },
  { key: "retail-store", name: "Retail store", icon: "inventory", recommendedPlan: "premium", recommendedCore: "store", priorityCategories: ["products-inventory", "orders-delivery"], priorityAddOns: ["inventory-management", "product-variations", "delivery-management", "customer-accounts"], order: 3 },
  { key: "professional-service", name: "Professional service", icon: "globe", recommendedPlan: "standard", recommendedCore: "booking", priorityCategories: ["customers-marketing", "website-extras"], priorityAddOns: ["customer-accounts", "advanced-reports"], order: 4 },
  { key: "sports-facility", name: "Sports facility", icon: "bolt", recommendedPlan: "standard", recommendedCore: "booking", priorityCategories: ["customers-marketing", "staff-operations"], priorityAddOns: ["memberships", "customer-accounts", "loyalty-rewards"], order: 5 },
  { key: "educational", name: "Educational business", icon: "chat", recommendedPlan: "standard", recommendedCore: "booking", priorityCategories: ["customers-marketing", "staff-operations"], priorityAddOns: ["customer-accounts", "memberships"], order: 6 },
  { key: "other", name: "Other", icon: "sparkle", recommendedPlan: "standard", recommendedCore: null, priorityCategories: [], priorityAddOns: [], order: 7 },
];

export const GLOSSARY = [
  { title: "Small update", body: "A small update includes changing existing text, prices, images, contact information or opening hours. It does not include new pages, redesigns, new systems or major feature development. Send updates by WhatsApp or through your dashboard; most are completed within 2 working days. Unused updates do not roll over. If you go over your monthly allowance we will tell you the cost before doing the work." },
  { title: "Active product", body: "A product currently published and available in the store. Archived or deleted products do not count toward the active product limit." },
  { title: "Active service", body: "A service currently published and available for customers to view or book." },
  { title: "Bookable staff", body: "A staff member customers can select when making a booking. This is different from Staff Management, which is an internal system for logins, schedules and permissions." },
  { title: "Custom integration", body: "A connection to an external system, platform or service. Availability and pricing depend on the provider and the complexity of the connection." },
  { title: "From pricing", body: "\"From\" means the displayed amount is the lowest starting price. The final amount depends on the features, capacity and complexity you choose." },
];

export const TERMS = [
  "All prices are starting prices unless otherwise stated.",
  "Final pricing is confirmed before development starts.",
  "Custom features may require a one-time setup or development fee.",
  "External provider charges are separate and paid to the provider.",
  "Payment gateway transaction fees are separate.",
  "Major redesigns are not small updates.",
  "Work outside the agreed scope is quoted separately.",
  "Plans and add-ons can be upgraded at any time.",
  "Minimum subscription periods may apply only when clearly disclosed.",
  "Customers must approve any additional cost before work begins.",
];

export const EXTERNAL_COSTS = [
  "Domain registration and renewal",
  "Business email",
  "Payment gateway fees",
  "SMS usage",
  "Premium third-party software",
  "External delivery services",
  "External API usage",
];

export const FAQS = [
  { q: "What counts as a small update?", a: "Changing existing text, a price, an image, your contact details or opening hours. New pages, redesigns and new systems are quoted separately. Most small updates are completed within 2 working days." },
  { q: "Can I add more products later?", a: "Yes. Standard includes 50 active products and you can add another 50 for +$5/month, as many times as you need. Nothing is a hard limit." },
  { q: "Can I upgrade my plan?", a: "Anytime. You keep everything you have and only pay the difference from your next billing month." },
  { q: "Can I downgrade my plan?", a: "Yes, as long as your setup fits the smaller plan. We will tell you exactly what would need to be removed before anything changes." },
  { q: "Can I add a second language?", a: "Yes. Language setup starts at $50 one-time. Translating your content is quoted separately depending on how much text there is." },
  { q: "Are domain costs included?", a: "No. The domain is registered in your name and charged by the provider. We always tell you the cost before buying anything." },
  { q: "Are payment gateway fees included?", a: "No. Payment providers charge their own transaction fee on each payment, paid directly to them." },
  { q: "Can I use both booking and online store?", a: "Standard includes one of the two. Premium includes one and lets you add the second for +$10/month." },
  { q: "What happens if I need more staff?", a: "Standard Booking includes 3 bookable staff and each additional one is +$2/month. Staff Management — logins, roles, schedules and permissions — is a separate module and requires Premium." },
  { q: "Are the add-on prices monthly?", a: "Most are monthly and shown as \"+$X/month\". Setup work such as logo design, photography, copywriting and data entry is one-time. Each add-on states which it is." },
  { q: "What requires a one-time setup fee?", a: "Design and content work: extra pages and sections, language setup, logo and branding, photography, copywriting, and entering your products or services for you." },
  { q: "What does \"From $30/month\" mean?", a: "$30 is the lowest Premium price, covering the starting package. The final amount depends on the modules and capacity you choose. The Plan Builder shows your exact estimate as you select." },
  { q: "Do unused monthly updates roll over?", a: "No. Each month's allowance starts fresh. If you regularly need more, adding 2 updates per month for +$3 is cheaper than paying per update." },
  { q: "Is custom development included?", a: "No. Custom workflows, integrations and bespoke tools are quoted separately and always approved by you before any work starts." },
  { q: "What happens if a third-party service changes its price?", a: "We tell you as soon as we know. External services are paid to the provider, so we cannot fix their pricing — but you will never be charged more without being told first." },
  { q: "Can I cancel an add-on without cancelling my website?", a: "Yes. Add-ons can be removed at the end of a billing month and your website keeps running normally." },
];
