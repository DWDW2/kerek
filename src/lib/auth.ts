import { betterAuth } from "better-auth";
import { BetterAuthOptions } from "better-auth";
import { env } from "../env";
export const auth = betterAuth<BetterAuthOptions>({
  appName: "Kerel",
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
});
