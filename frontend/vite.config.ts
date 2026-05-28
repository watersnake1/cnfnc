import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // snarkjs ships CommonJS; we need to include it in the Vite optimization pass
  optimizeDeps: {
    include: ["snarkjs", "buffer"],
  },
  define: {
    // some snarkjs/ffjavascript internals reference `global`
    global: "globalThis",
  },
  // snarkjs references ffjavascript which uses Worker; allow top-level await
  build: {
    target: "esnext",
  },
  // Expose large static artifacts from public/circuits without inlining
  assetsInclude: ["**/*.zkey", "**/*.wasm"],
  server: {
    port: 5173,
  },
});
