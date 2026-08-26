import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  esbuild: {
    target: "es2017",
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "es2017",
    },
  },
  build: {
    target: "es2017",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
