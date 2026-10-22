import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: {
    port: 5173,
    // In dev the frontend calls /api on itself and Vite forwards it to the backend, so no CORS setup is needed.
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});
