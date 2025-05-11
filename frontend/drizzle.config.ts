import { defineConfig } from "drizzle-kit";
import "dotenv/config";
import { env } from "@/env";

export default defineConfig({
  schema: "./src/server/db/schema",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
});
