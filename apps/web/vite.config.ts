import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": { target: process.env.VITE_API_PROXY ?? "http://localhost:4000", changeOrigin: false },
    },
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Match the package directly under node_modules, so "@phosphor-icons/react" is not "react".
          const pkg = /node_modules[\\/]((?:@[^\\/]+[\\/])?[^\\/]+)/.exec(id)?.[1]?.replace("\\", "/");
          if (!pkg) return undefined;
          if (["react", "react-dom", "scheduler", "react-router", "cookie"].includes(pkg)) return "react";
          if (["@reduxjs/toolkit", "react-redux", "redux", "immer", "reselect", "use-sync-external-store"].includes(pkg)) return "state";
          if (["motion", "framer-motion", "motion-dom", "motion-utils"].includes(pkg)) return "motion";
          if (["zod", "react-hook-form", "@hookform/resolvers"].includes(pkg)) return "forms";
          return undefined;
        },
      },
    },
  },
});
