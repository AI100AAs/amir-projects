import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";

// LM Studio base URL. Override with LMSTUDIO_URL env var if needed.
const LM_STUDIO = process.env.LMSTUDIO_URL || "http://localhost:1234";
// `npm run dev:lan` sets HTTPS=1 to serve over TLS so phones (which require a
// secure context for camera access) can use the app over your LAN.
const useHttps = process.env.HTTPS === "1" || process.env.HTTPS === "true";

// Same /llm → LM Studio proxy for both the dev server and `vite preview` (so a
// production build can also be served on the LAN and still reach the LLM).
const llmProxy = {
  "/llm": {
    target: LM_STUDIO,
    changeOrigin: true,
    rewrite: (p) => p.replace(/^\/llm/, ""),
  },
};

export default defineConfig({
  plugins: [react(), ...(useHttps ? [basicSsl()] : [])],
  server: {
    host: true, // listen on 0.0.0.0 so other devices on the network can connect
    port: 5173,
    proxy: llmProxy,
  },
  preview: {
    host: true,
    port: 4173,
    proxy: llmProxy,
  },
  // Both are large and lazy-loaded; let the browser fetch them as-is rather than
  // pre-bundling (kokoro-js/transformers.js has Node-only conditional deps that
  // trip up esbuild's optimizer).
  optimizeDeps: { exclude: ["@mediapipe/tasks-vision", "kokoro-js"] },
});
