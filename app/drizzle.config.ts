import { defineConfig } from "drizzle-kit";

// Only used to *generate* SQL migrations (npm run db:generate). Runtime migrations run
// automatically from src/db/index.ts against whichever database is configured.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
});
