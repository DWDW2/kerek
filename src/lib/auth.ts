import { betterAuth } from "better-auth";
import { BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { env } from "../env";
import { db } from "@/server/db";
import { user } from "@/server/db/schema/auth-schema";
import { account } from "@/server/db/schema/auth-schema";
import { session } from "@/server/db/schema/auth-schema";

export const auth = betterAuth<BetterAuthOptions>({
  appName: "Kerel",
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: user,
      session: session,
      account: account,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      enabled: true,
    },
  },
});
