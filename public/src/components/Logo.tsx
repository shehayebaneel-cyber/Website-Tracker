export function Flame({ size = 20 }: { size?: number }) {
  const id = "fl" + Math.round(size);
  return (
    <svg width={size} height={size * 1.25} viewBox="0 0 24 30" fill="none" aria-hidden>
      <defs>
        <linearGradient id={id} x1="12" y1="2" x2="12" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F7BF3F" />
          <stop offset="0.55" stopColor="#EE7A2B" />
          <stop offset="1" stopColor="#E0531C" />
        </linearGradient>
      </defs>
      <path
        d="M12 1.5c.7 3.7-1.3 5.6-3.1 7.8C7 11.6 5.3 13.8 5.3 17c0 4 3 6.9 6.7 6.9s6.7-2.9 6.7-6.9c0-2.6-1.1-4.2-2.3-5.8-.4 1-1 1.7-1.9 2.2.7-2.6.2-6.4-2.5-9.1-.1 2-.9 3-2 3.9C13 8.7 13 5 12 1.5Z"
        fill={`url(#${id})`}
      />
    </svg>
  );
}

export function Logo({ tagline = false, light = false, size = 1 }: { tagline?: boolean; light?: boolean; size?: number }) {
  const color = light ? "#fff" : "var(--ink)";
  return (
    <span className="inline-flex flex-col items-center leading-none" style={{ transform: `scale(${size})`, transformOrigin: "left" }}>
      <span
        className="inline-flex items-end"
        style={{ fontFamily: "var(--font-display)", fontWeight: 500, letterSpacing: "0.32em", fontSize: "1.5rem", color }}
      >
        <span>IGN</span>
        <span className="relative">
          <span
            className="absolute left-1/2 -translate-x-1/2"
            style={{ bottom: "0.85em" }}
          >
            <Flame size={13} />
          </span>
          I
        </span>
        <span>S</span>
      </span>
      {tagline && (
        <span
          style={{ fontFamily: "var(--font-display)", fontWeight: 500, letterSpacing: "0.28em", fontSize: "0.5rem", color: light ? "rgba(255,255,255,.7)" : "var(--muted)", marginTop: "0.35rem", marginLeft: "0.32em" }}
        >
          WE BUILD DIGITAL EXPERIENCES
        </span>
      )}
    </span>
  );
}
