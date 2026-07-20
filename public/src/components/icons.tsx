import type { ReactNode } from "react";

// Thin line icons matching the IGNIS sheets. 24px grid, currentColor stroke.
function I({ children }: { children: ReactNode }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
}

export const Icon = {
  inventory: () => <I><path d="M3 7l9-4 9 4-9 4-9-4Z" /><path d="M3 7v10l9 4 9-4V7" /><path d="M12 11v10" /></I>,
  customers: () => <I><circle cx="12" cy="8" r="3.2" /><path d="M5 20a7 7 0 0 1 14 0" /></I>,
  staff: () => <I><circle cx="9" cy="8" r="3" /><path d="M2.5 19a6.5 6.5 0 0 1 13 0" /><path d="M16 6.5a3 3 0 0 1 0 5.8" /><path d="M17.5 19a6.5 6.5 0 0 0-2-4.6" /></I>,
  loyalty: () => <I><rect x="3" y="7" width="18" height="12" rx="2" /><path d="M3 11h18" /><path d="M12 7V5.5a2 2 0 1 0-2 2h4a2 2 0 1 0-2-2Z" /></I>,
  delivery: () => <I><path d="M3 6h11v9H3z" /><path d="M14 9h4l3 3v3h-7" /><circle cx="7" cy="18" r="1.6" /><circle cx="17" cy="18" r="1.6" /></I>,
  reports: () => <I><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></I>,
  booking: () => <I><rect x="3" y="4.5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v3M16 3v3" /><path d="m9 14 2 2 4-4" /></I>,
  store: () => <I><path d="M4 9h16l-1 11H5L4 9Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></I>,
  shield: () => <I><path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" /><path d="m9 12 2 2 4-4" /></I>,
  phone: () => <I><path d="M5 4h4l1.5 4.5L8 11a12 12 0 0 0 5 5l2.5-2.5L20 15v4a1 1 0 0 1-1 1A15 15 0 0 1 4 5a1 1 0 0 1 1-1Z" /></I>,
  chat: () => <I><path d="M4 5h16v11H8l-4 3V5Z" /></I>,
  bolt: () => <I><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" /></I>,
  globe: () => <I><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" /></I>,
  sparkle: () => <I><path d="M12 3v6M12 15v6M3 12h6M15 12h6" /><path d="m6.5 6.5 3 3M14.5 14.5l3 3M17.5 6.5l-3 3M9.5 14.5l-3 3" /></I>,
  check: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="check" aria-hidden>
      <path d="m5 12 5 5 9-11" />
    </svg>
  ),
  arrow: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  ),
  whatsapp: ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2Zm5.8 14.2c-.2.7-1.4 1.3-1.9 1.4-.5.1-1.1.1-1.8-.1-.4-.1-1-.3-1.7-.6-3-1.3-4.9-4.3-5-4.5-.2-.2-1.3-1.7-1.3-3.2 0-1.5.8-2.3 1.1-2.6.3-.3.6-.4.8-.4h.6c.2 0 .4 0 .7.5.2.6.8 2 .9 2.1.1.1.1.3 0 .5-.1.2-.2.4-.3.5l-.5.5c-.2.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.2.4-.2.6-.1.2.1 1.5.7 1.7.9.3.1.4.2.5.3 0 .2 0 .8-.2 1.4Z" />
    </svg>
  ),
};
