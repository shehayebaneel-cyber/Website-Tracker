import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5190,
    proxy: {
      // used from Phase 2 onward (applications, support forms, client portal)
      "/api": { target: "http://localhost:4020", changeOrigin: true },
    },
  },
});
