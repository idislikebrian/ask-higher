import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";
import { magicLink } from "better-auth/plugins";
import { prisma } from "@/lib/db";
import { sendMagicLinkEmail } from "@/lib/email";
import { buildSocialProviders } from "@/lib/auth-providers";

const isDevelopment = process.env.NODE_ENV === "development";
const authBaseUrl = process.env.BETTER_AUTH_URL
  || (process.env.VERCEL_BRANCH_URL ? `https://${process.env.VERCEL_BRANCH_URL}` : undefined)
  || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined)
  || "http://localhost:3000";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: authBaseUrl,
  socialProviders: buildSocialProviders(),
  account: {
    accountLinking: {
      enabled: true,
      disableImplicitLinking: true,
    },
  },
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        if (isDevelopment) {
          await sendMagicLinkEmail({ to: email, url });
          return;
        }
        await sendMagicLinkEmail({ to: email, url });
      },
    }),
  ],
});
