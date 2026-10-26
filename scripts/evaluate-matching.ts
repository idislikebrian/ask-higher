const baseUrl = process.env.ASK_HIGHER_URL || "http://localhost:3000";
const queries = [
  "Who can help with research?",
  "Who can help with Solidity?",
  "Who works on design?",
  "Who is interested in physical computing?",
  "What projects are looking for collaborators?",
  "Who is involved with HIGHER.ZIP?",
  "I have a weekend free and can design. Where can I help?",
  "Who should I talk to about hardware?",
  "Who is interested in community tooling?",
  "Who can help with a deliberately unsupported marine biology domain?",
];

async function main() {
  for (const query of queries) {
    const response = await fetch(`${baseUrl}/api/ask`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query }) });
    const payload = await response.json();
    console.log(JSON.stringify({ query, status: response.status, strength: payload.strength, matches: (payload.matches || []).map((match: { profileId: string; displayName: string; strength: string; reasons: unknown[] }) => ({ profileId: match.profileId, displayName: match.displayName, strength: match.strength, reasons: match.reasons })) }));
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
