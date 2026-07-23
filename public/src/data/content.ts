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

// Plans, features, add-ons, prices, limits, eligibility rules and the list of
// separately charged services all come from the pricing catalogue in the
// database (`src/lib/catalogue.ts`) — never from this file. What is left here
// is brand copy that carries no price and no rule.

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

// General questions only. Anything that states a price, a limit or which plan a
// feature belongs to lives in the pricing catalogue (PricingFaq) so it can
// never drift from the plans — see `src/lib/catalogue.ts`.
export const FAQ: { q: string; a: string }[] = [
  { q: "What is included in the monthly price?", a: "Your website, hosting, SSL security, basic maintenance and a set number of small updates each month. Every plan lists exactly what's included — no surprises." },
  { q: "Is hosting included?", a: "Yes. Hosting and SSL (the security padlock) are included in every plan at no extra cost." },
  { q: "Can I cancel?", a: "Yes. A minimum subscription period may apply depending on your plan — we'll explain it clearly before you start." },
  { q: "How long does a website take?", a: "Most simple sites launch within a couple of weeks once we have your content. Larger systems depend on the features you need." },
  { q: "What is considered a major redesign?", a: "Rebuilding a page's layout, restructuring the site, or new branding. These are charged separately and always quoted before any work begins." },
  { q: "Who owns the website and content?", a: "You own your content and business information. We manage and maintain the website as part of your subscription." },
  { q: "What happens if I miss a payment?", a: "We'll send a friendly reminder. Your website keeps running while we sort it out — we'll never pull it down without talking to you first." },
];
