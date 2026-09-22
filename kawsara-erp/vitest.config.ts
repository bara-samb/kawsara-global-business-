import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./tests/setup.ts"],
    globalSetup: ["./tests/global-setup.ts"],
    env: {
      DATABASE_URL: "file:./test.db",
      AUTH_SECRET: "test-secret-not-for-production-0123456789",
    },
    // SQLite n'autorise qu'un seul ecrivain a la fois : les fichiers de test partagent la
    // meme base et doivent donc s'executer sequentiellement, pas dans des workers paralleles.
    fileParallelism: false,
    // Le verrouillage de fichier SQLite sous Windows peut brievement retarder l'ouverture
    // d'une nouvelle connexion juste apres la deconnexion du fichier de test precedent.
    hookTimeout: 30_000,
    testTimeout: 15_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Next.js alias "server-only" vers un no-op dans son bundler ; on reproduit ce
      // comportement ici puisque vitest n'utilise pas le bundler de Next.js.
      "server-only": path.resolve(__dirname, "./tests/shims/noop.ts"),
    },
  },
});
