# Ask Higher deployment readiness

## Current mapping

- Local development: Neon `development` branch.
- Vercel preview: should use Neon `development` or a dedicated preview branch.
- Vercel production: should use Neon `production` only after the tested migrations are promoted intentionally.

No production Neon branch was modified for COB-696.

## Required environment variables

### Neon

- `DATABASE_URL` — pooled connection for the selected Neon branch.
- `DATABASE_URL_UNPOOLED` — direct connection for Prisma migrations where required.

### Better Auth

- `BETTER_AUTH_SECRET` — long random production secret.
- `BETTER_AUTH_URL` — the deployed application origin, with no trailing path.

The application currently uses same-origin callback URLs and secure cookie behavior supplied by Better Auth in production. Configure the deployed origin as an allowed/trusted origin if the Better Auth version or hosting setup requires it.

### Email sender

Development magic links are logged to the server terminal only. Preview and production use the server-only Resend adapter in `lib/email.ts` and intentionally fail closed when `RESEND_API_KEY` or `EMAIL_FROM` is missing.

Before Gate A, create/authorize a Resend account, verify the sending domain, and configure `RESEND_API_KEY` and `EMAIL_FROM` in the deployed environment. The provider credential and sender address remain server-only environment variables; they are never exposed to the client.

### Vercel

No Vercel project metadata or CLI was available in this workspace during readiness inspection. Link or create the single `ask-higher` project under the intended Higher account before deploying. Configure Preview against Neon `development` (or a dedicated preview branch), and Production against Neon `production` only after an intentional migration promotion.

## Deployment checklist

1. Create or select a preview Neon branch.
2. Pull preview env values with the Neon CLI; do not copy production credentials into preview.
3. Run `npx prisma migrate deploy` against the intended preview branch.
4. Configure Better Auth secret and deployed URL in Vercel Preview.
5. Configure and test real magic-link delivery.
6. Promote the tested migrations to Neon production only when the production deployment is intentionally prepared.
