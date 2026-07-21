import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // Admin dashboard is served under /app in production (public marketing site
  // owns the root). API calls use absolute /api so they're unaffected.
  base: "/app/",
  plugins: [react(), tailwindcss()],
  server: {
    port: 5180,
    proxy: {
      "/api": {
        target: "http://localhost:4020",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://localhost:4020",
        changeOrigin: true,
      },
    },
  },
});
