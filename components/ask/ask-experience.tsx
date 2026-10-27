"use client";

import { useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import type { AskHigherResponse, MatchEvidence, MatchResult } from "@/lib/matching/types";

const suggestions = [
  "Who can help with Solidity?",
  "Who should I talk to about hardware?",
  "What Higher projects need design help?",
  "Where can I contribute this weekend?",
];

export function AskExperience() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<AskHigherResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function ask(value = query) {
    const trimmed = value.trim();
    if (trimmed.length < 3) return;
    setQuery(value);
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/ask", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: trimmed }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Something went wrong while searching. Try again.");
      setResult(payload as AskHigherResponse);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong while searching. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return <main className="min-h-screen px-5 pb-20 sm:px-10">
    <SiteHeader variant="ask" />
    <div className="preview-wrap ask-wrap">
      <p className="text-xs font-bold tracking-[0.18em] text-[var(--muted)]">DISCOVER PEOPLE AND PROJECTS</p>
      <h1 className="question-title ask-title">Who should you talk to?</h1>
      <form className="ask-query" onSubmit={(event) => { event.preventDefault(); void ask(); }}>
        <input autoFocus className="ask-query-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ask a useful question…" aria-label="Ask Higher a question" />
        <button className="primary" disabled={loading || query.trim().length < 3}>{loading ? "Searching…" : "Ask ↗"}</button>
      </form>
      <div className="ask-suggestions"><p className="suggestion-label">Try</p><div className="ask-suggestion-grid">{suggestions.map((suggestion) => <button key={suggestion} className="ask-suggestion" onClick={() => void ask(suggestion)}>{suggestion} <span aria-hidden>↗</span></button>)}</div></div>
      {error && <p className="validation-message" role="alert">{error}</p>}
      {loading && <p className="ask-loading">Searching the network…</p>}
      {result && !loading && <Results result={result} />}
    </div>
  </main>;
}

function Results({ result }: { result: AskHigherResponse }) {
  if (result.strength === "NONE") return <section className="ask-results ask-no-match"><p className="text-xs font-bold tracking-[0.18em] text-[var(--muted)]">NO STRONG MATCH</p><h2 className="ask-results-title">Nothing strong yet.</h2><p className="ask-no-match-copy">The network doesn’t currently have enough grounded evidence for that request. Try another question or join the network to make your own work easier to find.</p><Link href="/join" className="primary">Join the network <span aria-hidden>↗</span></Link></section>;
  return <section className="ask-results"><div className="ask-results-header"><div><p className="text-xs font-bold tracking-[0.18em] text-[var(--muted)]">GROUNDED PATHS</p><h2 className="ask-results-title">People and projects to explore</h2></div><span className="ask-result-count">{result.matches.length} result{result.matches.length === 1 ? "" : "s"}</span></div><div>{result.matches.map((match) => <MatchCard key={match.profileId} match={match} />)}</div></section>;
}

function MatchCard({ match }: { match: MatchResult }) {
  return <article className="ask-match"><div className="ask-match-header"><div><div className="ask-match-name-row"><h3 className="ask-match-name">{match.displayName}</h3><span className="ask-match-strength">{match.profileType === "PROJECT" ? "Project" : match.strength === "STRONG" ? "Strong match" : "Partial match"}</span></div><p className="ask-match-identity">{match.identityText}</p></div></div><div className="ask-evidence"><p className="suggestion-label">Why this match</p><ul className="ask-evidence-grid">{match.reasons.map((reason, index) => <li key={`${reason.sourceType}-${reason.sourceId || index}`}><Evidence evidence={reason} /></li>)}</ul></div><ContactActions match={match} /></article>;
}

function Evidence({ evidence }: { evidence: MatchEvidence }) { const labels: Record<MatchEvidence["sourceType"], string> = { CAPABILITY: "Can help with", INTEREST: "Interested in", IDENTITY: "About", ASK: "Current ask", PROJECT: "Building", PROJECT_ROLE: "Project role", TIMEZONE: "Timezone" }; return <div className="ask-evidence-item"><p>{evidenceText(evidence)}</p><span>{labels[evidence.sourceType]}</span></div>; }

function evidenceText(evidence: MatchEvidence) { if (evidence.sourceType === "ASK") { const [, detail] = evidence.submittedText.split(": "); return detail || evidence.submittedText; } return evidence.submittedText; }

function ContactActions({ match }: { match: MatchResult }) { if (match.contacts?.length) return <div className="ask-contact">{match.contacts.map((contact) => { const href = contactHref(contact.method, contact.value); return href ? <a key={`${contact.method}-${contact.value}`} className="text-button" href={href} target="_blank" rel="noreferrer">{contact.method} <span aria-hidden>↗</span></a> : <span key={`${contact.method}-${contact.value}`} className="text-sm font-semibold">{contact.method}</span>; })}</div>; if (match.contactPreference === "INTRO_REQUESTS" || match.contactPreference === "BOTH") return <p className="ask-contact-note">Open to intro requests.</p>; return null; }

function contactHref(method: string, value: string) { if (value.startsWith("http")) return value; const handle = value.replace(/^@/, ""); if (method === "Telegram") return `https://t.me/${handle}`; if (method === "X") return `https://x.com/${handle}`; if (method === "Email") return `mailto:${value}`; return undefined; }
