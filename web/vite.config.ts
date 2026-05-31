import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In dev, proxy /api to the local render-service (uvicorn on :8100). In
// production the frontend calls the render-service via VITE_API_BASE (its
// Cloud Run URL / custom domain); see src/api.ts.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      "/api": {
        target: process.env.RENDER_API ?? "http://127.0.0.1:8100",
        changeOrigin: true,
      },
    },
  },
});
