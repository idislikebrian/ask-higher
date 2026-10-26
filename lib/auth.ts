import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";
import { magicLink } from "better-auth/plugins";
import { prisma } from "@/lib/db";
import { sendMagicLinkEmail } from "@/lib/email";

const isDevelopment = process.env.NODE_ENV === "development";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
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
