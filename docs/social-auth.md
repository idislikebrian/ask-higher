# Ask Higher social authentication

The public-alpha claim flow uses the existing Better Auth `User`, `Account`, `Session`, and `ProfileOwner` records. The provider order in the UI is Farcaster, Google, GitHub, and X. The first three OAuth providers are configured only when both their server-side client ID and secret are present.

## Preview provider callbacks

Register these exact callbacks in the provider consoles:

```text
https://aethernet.lol/api/auth/callback/google
https://aethernet.lol/api/auth/callback/github
https://aethernet.lol/api/auth/callback/twitter
```

The previous Vercel branch callbacks remain historical deployment notes only:

```text
https://ask-higher-git-gate-a-preview-idislikebrians-projects.vercel.app/api/auth/callback/google
https://ask-higher-git-gate-a-preview-idislikebrians-projects.vercel.app/api/auth/callback/github
https://ask-higher-git-gate-a-preview-idislikebrians-projects.vercel.app/api/auth/callback/twitter
```

Required Preview environment variables:

```text
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
TWITTER_CLIENT_ID
TWITTER_CLIENT_SECRET
```

X is configured with the `users.email` scope. The provider application must have an API configuration that permits that scope. OAuth credentials are never sent to the browser.

Account linking is enabled for future explicit linking, but implicit same-email linking is disabled. A social login therefore cannot silently merge unrelated accounts.

## Magic link

The existing magic-link plugin remains intact as a secondary development fallback. It is not a primary public-alpha option. Development can continue to log/send through the existing adapter; Preview/production still requires the configured Resend sender.

## Farcaster status

Farcaster is intentionally not wired as a fake OAuth provider. Official Sign In With Farcaster (SIWF) uses a signed Farcaster authentication message and an AuthKit QR/deep-link flow, rather than a normal OAuth authorization-code callback. AuthKit can verify the response and provide the FID and username, but the existing Better Auth/Prisma User model requires a non-null unique email.

We do not invent an email address or create a second unconnected session. The Preview button is therefore a clear placeholder and does not claim a Farcaster login succeeded.

The clean next bridge is to add an explicit Farcaster identity record containing FID, username/display identity, provider identifier, and verified auth metadata, then establish the existing Better Auth ownership/session only after deciding how a Farcaster-primary user satisfies the required email invariant. That decision should be made before adding a migration.

For the future alpha origin, the SIWF/AuthKit configuration would use:

```text
domain: aethernet.lol
siweUri: https://aethernet.lol/join
```

The official AuthKit setup also requires its configured Farcaster relay/RPC values. No Farcaster credentials or schema changes are included in this pass.
