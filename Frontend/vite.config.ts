// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  vite: {
    server: {
      // Keep browser -> Flask on one origin. Only the Flask endpoints are
      // proxied so the app's own `/api/public/*` SSR routes stay local.
      proxy: {
        // Be defensive against HMR/cached modules accidentally double-prefixing.
        "^/api/api/.*": {
          target: "http://127.0.0.1:5000",
          changeOrigin: false,
          rewrite: (path) => path.replace(/^\/api\/api\//, "/api/"),
        },
        "/api/health": { target: "http://127.0.0.1:5000", changeOrigin: false },
        "/api/models": { target: "http://127.0.0.1:5000", changeOrigin: false },
        "/api/predict": { target: "http://127.0.0.1:5000", changeOrigin: false },
        "/api/training-sessions": { target: "http://127.0.0.1:5000", changeOrigin: false },
        "/api/telemetry": { target: "http://127.0.0.1:5000", changeOrigin: false },
        "/api/coaching-presets": { target: "http://127.0.0.1:5000", changeOrigin: false },
        "/api/hardware": { target: "http://127.0.0.1:5000", changeOrigin: false },
        "/api/devices": { target: "http://127.0.0.1:5000", changeOrigin: false },
        "/api/telemetry/dummy": { target: "http://127.0.0.1:5000", changeOrigin: false },
      },
      // Transform the route graph while the dev server boots instead of on the
      // first navigation to each screen.
      warmup: {
        clientFiles: [
          "./src/routes/__root.tsx",
          "./src/routes/index.tsx",
          "./src/routes/live.tsx",
          "./src/routes/analytics.tsx",
          "./src/routes/training-modes.tsx",
          "./src/routes/settings.tsx",
          "./src/components/tactical-shell.tsx",
        ],
      },
    },
    optimizeDeps: {
      // Prebundle interactive UI dependencies with React at startup rather than
      // discovering them during HMR, which can mix React module generations.
      include: ["@radix-ui/react-dialog", "@radix-ui/react-slot", "@radix-ui/react-select", "@radix-ui/react-slider", "@radix-ui/react-switch", "framer-motion", "lucide-react", "recharts"],
    },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
