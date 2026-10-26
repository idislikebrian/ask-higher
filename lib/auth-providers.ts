import type { BetterAuthOptions } from "better-auth";

type SocialProviders = NonNullable<BetterAuthOptions["socialProviders"]>;
type ProviderEnv = Partial<Record<"GOOGLE_CLIENT_ID" | "GOOGLE_CLIENT_SECRET" | "GITHUB_CLIENT_ID" | "GITHUB_CLIENT_SECRET" | "TWITTER_CLIENT_ID" | "TWITTER_CLIENT_SECRET", string>>;

export function buildSocialProviders(env: ProviderEnv = process.env as ProviderEnv): SocialProviders {
  return {
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET ? {
      google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET },
    } : {}),
    ...(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET ? {
      github: { clientId: env.GITHUB_CLIENT_ID, clientSecret: env.GITHUB_CLIENT_SECRET },
    } : {}),
    ...(env.TWITTER_CLIENT_ID && env.TWITTER_CLIENT_SECRET ? {
      twitter: {
        clientId: env.TWITTER_CLIENT_ID,
        clientSecret: env.TWITTER_CLIENT_SECRET,
        scope: ["users.email"],
      },
    } : {}),
  };
}
