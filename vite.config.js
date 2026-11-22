import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "directive-ai/dist",
    emptyOutDir: false,
    lib: {
      entry: "directive-ai/plugin/src/artist.js",
      name: "DirectiveArtist",
      formats: ["iife"],
      fileName: () => "artist.js",
    },
  },
});
