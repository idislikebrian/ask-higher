import assert from "node:assert/strict";
import { buildSocialProviders } from "../lib/auth-providers";

const providers = buildSocialProviders({
  GOOGLE_CLIENT_ID: "google-id",
  GOOGLE_CLIENT_SECRET: "google-secret",
  GITHUB_CLIENT_ID: "github-id",
  GITHUB_CLIENT_SECRET: "github-secret",
  TWITTER_CLIENT_ID: "twitter-id",
  TWITTER_CLIENT_SECRET: "twitter-secret",
});

assert.deepEqual(Object.keys(providers).sort(), ["github", "google", "twitter"]);
assert.equal((providers.google as { clientId: string }).clientId, "google-id");
assert.equal((providers.github as { clientId: string }).clientId, "github-id");
assert.deepEqual((providers.twitter as { scope: string[] }).scope, ["users.email"]);
assert.deepEqual(buildSocialProviders({ GOOGLE_CLIENT_ID: "only-id" }), {});
console.log("auth provider configuration tests passed");
