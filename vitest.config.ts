import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Configuration Vitest.
 *
 * `resolve.alias` reproduit le `@/*` de tsconfig.json : sans lui, chaque
 * import de test echouerait sur les modules applicatifs.
 *
 * `environment: "node"` : les fonctions testees (`safeRedirectPath`,
 * schemas Zod, constantes) n'utilisent ni DOM ni hooks. Un environnement
 * navigateur serait plus lent et mockerait des API absentes.
 *
 * `include` cible `lib/**` : c'est la ou se trouve la logique metier pure.
 * Tester des composants React supposerait @testing-library et du rendu —
 * a prevoir si le projet cherche cette couverture, pas avant.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["lib/**/*.ts"],
      exclude: ["lib/**/*.test.ts", "lib/supabase/**", "lib/stores/**"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});