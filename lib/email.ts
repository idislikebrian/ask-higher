type MagicLinkEmail = { to: string; url: string };

function requiredProductionEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required production email configuration: ${name}`);
  return value;
}

export async function sendMagicLinkEmail({ to, url }: MagicLinkEmail): Promise<void> {
  if (process.env.NODE_ENV === "development") {
    console.info(`[better-auth:dev] Magic link for ${to}: ${url}`);
    return;
  }

  const apiKey = requiredProductionEnv("RESEND_API_KEY");
  const from = requiredProductionEnv("EMAIL_FROM");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Sign in to Ask Higher",
      html: `<p><strong>Ask Higher</strong></p><p>Sign in to Ask Higher</p><p><a href="${escapeHtml(url)}">Continue to Ask Higher</a></p><p>This link expires.</p>`,
      text: `Ask Higher\n\nSign in to Ask Higher\n\nContinue to Ask Higher: ${url}\n\nThis link expires.`,
    }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Magic-link email delivery failed (${response.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`);
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] || character);
}
