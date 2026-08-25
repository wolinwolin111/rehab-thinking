import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "./db/schema/pilot-schema.ts",
  dialect: "sqlite",
});
