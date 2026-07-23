import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // The Plan Builder prices selections in the browser with the SAME engine
      // the server uses, rather than a copy that could drift from it.
      // `server/src/lib/pricing.ts` is deliberately free of Prisma and Express
      // imports so it can be bundled here. `/quote` remains the authority.
      "@engine": fileURLToPath(new URL("../server/src/lib/pricing.ts", import.meta.url)),
    },
  },
  server: {
    port: 5190,
    // the engine lives outside this app's root
    fs: { allow: [".."] },
    proxy: {
      // used from Phase 2 onward (applications, support forms, client portal)
      "/api": { target: "http://localhost:4020", changeOrigin: true },
    },
  },
});
