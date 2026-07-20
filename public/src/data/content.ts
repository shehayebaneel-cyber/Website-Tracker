export const CONTACT = {
  whatsapp: "+961 81 703 597",
  whatsappDigits: "96181703597",
  phone: "+961 81 703 597",
  email: "hello@ignis.com",
  hours: "Mon–Sat · 9:00 AM – 8:00 PM",
};

export function waLink(text?: string) {
  const base = `https://wa.me/${CONTACT.whatsappDigits}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export interface Plan {
  key: string;
  name: string;
  price: string;
  priceNote: string;
  tagline: string;
  bestFor: string;
  features: string[];
  popular?: boolean;
}

export const PLANS: Plan[] = [
  {
    key: "basic",
    name: "Basic",
    price: "$10",
    priceNote: "/month",
    tagline: "Your online presence",
    bestFor: "Best for businesses that need a simple, professional online presence.",
    features: [
      "One-page business website",
      "Up to 6 website sections",
      "Mobile, tablet and desktop ready",
      "Services, prices and gallery",
      "WhatsApp and contact buttons",
      "Google Maps and social links",
      "Hosting and SSL included",
      "Basic website maintenance",
      "1 small update every month",
    ],
  },
  {
    key: "standard",
    name: "Standard",
    price: "$20",
    priceNote: "/month",
    tagline: "Accept bookings or orders",
    bestFor: "Best for businesses ready to accept customers online.",
    popular: true,
    features: [
      "Everything included in Basic",
      "Booking system OR online store",
      "Basic owner dashboard",
      "Manage bookings or orders",
      "Up to 3 booking staff",
      "Up to 30 listed services",
      "Up to 50 store products",
      "Cash or Whish payment option",
      "3 small updates every month",
    ],
  },
  {
    key: "premium",
    name: "Premium",
    price: "From $30",
    priceNote: "/month",
    tagline: "Built around your business",
    bestFor: "Best for businesses needing a custom management system.",
    features: [
      "Everything included in Standard",
      "Advanced owner dashboard",
      "One advanced business feature",
      "Basic business reports",
      "Priority technical support",
      "Owner dashboard training",
      "Up to 5 small updates monthly",
      "Additional modules available",
      "Final price based on complexity",
    ],
  },
];

export interface Module {
  key: string;
  name: string;
  price: string;
  icon: string;
  blurb: string;
  features: string[];
  bestFor: string;
}

export const MODULES: Module[] = [
  { key: "inventory", name: "Inventory Management", price: "From +$10/month", icon: "inventory", blurb: "Track stock, suppliers, movements and low-stock alerts.", bestFor: "Restaurants, cafés, retail and any product business.", features: ["Products and ingredients", "Current stock levels", "Suppliers & receiving", "Stock movements", "Low-stock alerts", "Basic inventory reports"] },
  { key: "customers", name: "Customer Accounts", price: "From +$5/month", icon: "customers", blurb: "Logins, profiles, favourites and booking or order history.", bestFor: "Businesses with repeat customers.", features: ["Customer registration & login", "Profiles & saved details", "Favourites", "Booking / order history"] },
  { key: "staff", name: "Staff Management", price: "From +$5/month", icon: "staff", blurb: "Staff accounts, schedules, permissions and assigned work.", bestFor: "Teams with multiple employees.", features: ["Staff accounts", "Roles & permissions", "Schedules", "Assigned tasks", "Staff activity"] },
  { key: "loyalty", name: "Loyalty & Gift Cards", price: "From +$5/month", icon: "loyalty", blurb: "Points, rewards, birthday offers and digital gift cards.", bestFor: "Cafés, salons and repeat-visit businesses.", features: ["Customer points", "Rewards & birthday offers", "Digital gift cards", "Redemption history"] },
  { key: "delivery", name: "Delivery Management", price: "From +$10/month", icon: "delivery", blurb: "Delivery zones, fees, drivers and order-status tracking.", bestFor: "Restaurants and stores that deliver.", features: ["Delivery areas & fees", "Driver accounts", "Order status", "Basic delivery tracking"] },
  { key: "reports", name: "Reports & Analytics", price: "From +$5/month", icon: "reports", blurb: "Revenue, customers, popular services and performance reports.", bestFor: "Owners who want to understand their numbers.", features: ["Revenue reports", "Customer reports", "Popular services & products", "Booking / order performance"] },
];

export const EXTRA_MODULES = ["Multi-branch support", "Automated notifications", "Online payments", "Custom dashboards", "Membership systems", "Queue management", "Appointment reminders", "Digital menus", "Customer reviews", "Employee attendance", "Custom business tools"];

export const CHARGED_SEPARATELY = [
  "Domain registration and renewal",
  "Business email services",
  "Logo and brand identity",
  "Photography and content writing",
  "Additional languages",
  "Payment-provider fees",
  "Premium third-party software",
  "Large product entry",
  "Major redesigns",
  "Work beyond the agreed scope",
];

export const TRUST = [
  { icon: "bolt", label: "Affordable monthly plans" },
  { icon: "globe", label: "Mobile-friendly websites" },
  { icon: "shield", label: "Hosting & SSL included" },
  { icon: "chat", label: "Ongoing technical support" },
  { icon: "booking", label: "Booking & online ordering" },
  { icon: "sparkle", label: "No technical experience needed" },
];

export const STEPS = [
  { n: 1, title: "Tell us about your business", text: "Send your logo, services, prices and photos." },
  { n: 2, title: "Choose your package", text: "We help select the right plan and features." },
  { n: 3, title: "We design and build it", text: "We design and build your website or system." },
  { n: 4, title: "We launch and support it", text: "We launch it and provide ongoing support." },
];

export interface Project {
  name: string;
  category: string;
  blurb: string;
  features: string[];
  plan: string;
  accent: string;
}

// Placeholder showcase projects (swap for real, permitted client work).
export const PROJECTS: Project[] = [
  { name: "Bean Avenue Café", category: "Restaurants & Cafés", blurb: "Digital menu, online ordering and a loyalty program.", features: ["Online ordering", "Digital menu", "Loyalty points"], plan: "Premium", accent: "#C0703A" },
  { name: "Riwa Glam Salon", category: "Salons", blurb: "Appointment booking with staff schedules and reminders.", features: ["Booking system", "Staff schedules", "Reminders"], plan: "Standard", accent: "#B84E7A" },
  { name: "Grey Clinics", category: "Clinics", blurb: "Professional presence with services, doctors and booking.", features: ["Service pages", "Doctor profiles", "Contact booking"], plan: "Standard", accent: "#3C7C86" },
  { name: "Tania Madi Photography", category: "Artists", blurb: "Portfolio, booking and a print shop in one place.", features: ["Portfolio gallery", "Session booking", "Print store"], plan: "Premium", accent: "#8A6BB0" },
  { name: "Aley Events", category: "Events", blurb: "Event showcase with enquiry forms and gallery.", features: ["Event gallery", "Enquiry forms", "Packages"], plan: "Standard", accent: "#C99A2E" },
  { name: "RG Home Appliances", category: "E-commerce", blurb: "Bilingual store with cash-on-delivery checkout.", features: ["Online store", "COD checkout", "Bilingual"], plan: "Premium", accent: "#2E6FB0" },
];

export const WORK_FILTERS = ["All", "Restaurants & Cafés", "Salons", "Clinics", "Artists", "Events", "E-commerce"];

export const FAQ: { q: string; a: string }[] = [
  { q: "What is included in the monthly price?", a: "Your website, hosting, SSL security, basic maintenance and a set number of small updates each month. Every plan lists exactly what's included — no surprises." },
  { q: "Is hosting included?", a: "Yes. Hosting and SSL (the security padlock) are included in every plan at no extra cost." },
  { q: "Is the domain included?", a: "Domain registration and renewal are charged separately, because the domain is yours and priced by the provider. We'll always tell you the cost before buying anything." },
  { q: "Can I cancel?", a: "Yes. A minimum subscription period may apply depending on your plan — we'll explain it clearly before you start." },
  { q: "How long does a website take?", a: "Most Basic and Standard sites launch within a couple of weeks once we have your content. Premium systems depend on the features you need." },
  { q: "How many updates are included?", a: "Basic includes 1 small update per month, Standard 3, and Premium up to 5. Larger changes are quoted first and only start after you approve." },
  { q: "What counts as a small update?", a: "Changing text or a price, swapping a photo, adding or removing a service or product — quick edits that don't require a redesign." },
  { q: "What is considered a major redesign?", a: "Rebuilding a page's layout, restructuring the site, or new branding. These are charged separately and always quoted before any work begins." },
  { q: "Can I upgrade my package?", a: "Anytime. You can move from Basic to Standard to Premium as your business grows." },
  { q: "Can I accept Whish or cash?", a: "Yes. Standard and Premium plans support cash and Whish payment options for bookings and orders." },
  { q: "Who owns the website and content?", a: "You own your content and business information. We manage and maintain the website as part of your subscription." },
  { q: "What happens if I miss a payment?", a: "We'll send a friendly reminder. Your website keeps running while we sort it out — we'll never pull it down without talking to you first." },
];
