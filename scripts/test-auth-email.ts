import { config } from "dotenv";

config({ path: ".env.local" });
config();

function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }

async function main() {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalApiKey = process.env.RESEND_API_KEY;
  const originalFrom = process.env.EMAIL_FROM;
  const originalFetch = globalThis.fetch;
  const originalInfo = console.info;
  let developmentLogged = false;
  const { sendMagicLinkEmail } = await import("@/lib/email");
  let request: RequestInit | undefined;
  globalThis.fetch = async (_input, init) => { request = init; return new Response(JSON.stringify({ id: "email-test" }), { status: 200 }); };
  const mutableEnv = process.env as Record<string, string | undefined>;
  mutableEnv.NODE_ENV = "development";
  console.info = (...args: unknown[]) => { if (String(args[0]).includes("[better-auth:dev]")) developmentLogged = true; };
  await sendMagicLinkEmail({ to: "test@example.com", url: "http://localhost:3000/join" });
  assert(developmentLogged, "Development email delivery did not use terminal logging.");
  mutableEnv.NODE_ENV = "production";
  delete process.env.RESEND_API_KEY;
  delete process.env.EMAIL_FROM;
  let failedClosed = false;
  try { await sendMagicLinkEmail({ to: "test@example.com", url: "https://ask-higher.example/auth/callback?token=secret" }); } catch { failedClosed = true; }
  assert(failedClosed, "Production email delivery did not fail closed without configuration.");
  process.env.RESEND_API_KEY = "test-key";
  process.env.EMAIL_FROM = "Ask Higher <ask@example.com>";
  await sendMagicLinkEmail({ to: "test@example.com", url: "https://ask-higher.example/auth/callback?token=secret" });
  assert(request?.body && String(request.body).includes("Continue to Ask Higher"), "Resend payload did not contain the transactional message.");
  assert(request?.body && String(request.body).includes("spam or junk"), "Resend payload did not include the delivery fallback guidance.");
  assert(request?.headers && JSON.stringify(request.headers).includes("Bearer test-key"), "Resend authorization was not server-side configured.");
  globalThis.fetch = originalFetch;
  console.info = originalInfo;
  if (originalNodeEnv === undefined) delete mutableEnv.NODE_ENV; else mutableEnv.NODE_ENV = originalNodeEnv;
  if (originalApiKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = originalApiKey;
  if (originalFrom === undefined) delete process.env.EMAIL_FROM; else process.env.EMAIL_FROM = originalFrom;
  console.log("Auth email invariants passed: development logging, production fail-closed, and Resend request shape.");
}

void main();
