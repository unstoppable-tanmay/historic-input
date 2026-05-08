import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";

const dir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: dir,
  server: {
    fs: {
      allow: [path.resolve(dir, "../..")],
    },
  },
});
