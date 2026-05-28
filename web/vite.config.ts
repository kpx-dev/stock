import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Base path is configurable so that local dev uses '/' and CI builds use '/stock/'.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE || "/",
  build: {
    chunkSizeWarningLimit: 5000,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("plotly.js")) return "plotly";
          if (id.includes("react")) return "react";
        },
      },
    },
  },
});
