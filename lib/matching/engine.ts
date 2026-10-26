import type { ContactMethod, ContactPreference, ProfileType } from "@/lib/types";
import type { MatchEvidence, MatchResult } from "./types";
import { interpretQuery } from "./interpret";

export type MatchingCandidate = {
  id: string;
  type: ProfileType;
  displayName: string;
  identityText: string;
  skills: Array<{ id: string; canonicalName: string; originalText?: string | null }>;
  interests: Array<{ id: string; canonicalName: string; originalText?: string | null }>;
  asks: Array<{ id: string; type: string; detail: string; urgency: string }>;
  projects: Array<{ id: string; name: string; description: string; role?: string | null; originalRoleText?: string | null }>;
  timezone?: string | null;
  contactPreference?: ContactPreference | null;
  contacts: Array<{ method: ContactMethod; value: string; visibility: "PUBLIC" | "PRIVATE" }>;
  exclusions: string[];
};

type Ranked = { result: MatchResult; score: number };

function textMatches(text: string, terms: string[]) {
  const normalized = text.toLowerCase();
  return terms.some((term) => normalized.includes(term));
}

function evidenceFor(candidate: MatchingCandidate, query: string): { evidence: MatchEvidence[]; score: number } {
  const intent = interpretQuery(query);
  const evidence: MatchEvidence[] = [];
  let score = 0;
  for (const skill of candidate.skills) if (textMatches(`${skill.canonicalName} ${skill.originalText || ""}`, intent.terms)) { evidence.push({ sourceType: "CAPABILITY", sourceId: skill.id, submittedText: skill.originalText || skill.canonicalName, canonicalValue: skill.canonicalName }); score += 100; }
  for (const ask of candidate.asks) if (textMatches(`${ask.type} ${ask.detail}`, intent.terms)) { evidence.push({ sourceType: "ASK", sourceId: ask.id, submittedText: `${ask.type}: ${ask.detail}`, canonicalValue: ask.urgency }); score += 80; }
  for (const project of candidate.projects) if (textMatches(`${project.name} ${project.description} ${project.role || ""} ${project.originalRoleText || ""}`, intent.terms) || intent.wantsProjects && candidate.type === "PROJECT" && candidate.asks.some((ask) => textMatches(ask.type, intent.terms))) { evidence.push({ sourceType: "PROJECT", sourceId: project.id, submittedText: project.description || project.name, canonicalValue: project.name }); score += 70; if (project.role && textMatches(project.role, intent.terms)) { evidence.push({ sourceType: "PROJECT_ROLE", sourceId: project.id, submittedText: project.originalRoleText || project.role, canonicalValue: project.role }); score += 15; } }
  for (const interest of candidate.interests) if (textMatches(`${interest.canonicalName} ${interest.originalText || ""}`, intent.terms)) { evidence.push({ sourceType: "INTEREST", sourceId: interest.id, submittedText: interest.originalText || interest.canonicalName, canonicalValue: interest.canonicalName }); score += 55; }
  if (candidate.identityText && textMatches(candidate.identityText, intent.terms)) { evidence.push({ sourceType: "IDENTITY", submittedText: candidate.identityText }); score += 35; }
  return { evidence, score };
}

export function rankCandidates(query: string, candidates: MatchingCandidate[]): MatchResult[] {
  const intent = interpretQuery(query);
  const ranked: Ranked[] = [];
  for (const candidate of candidates) {
    if (candidate.exclusions.some((exclusion) => textMatches(exclusion, intent.terms))) continue;
    const { evidence, score } = evidenceFor(candidate, query);
    if (!evidence.length) continue;
    const strong = score >= 80 || evidence.some((item) => item.sourceType === "CAPABILITY");
    const contacts = candidate.contactPreference === "DIRECT_CONTACT" || candidate.contactPreference === "BOTH"
      ? candidate.contacts.filter((contact) => contact.visibility === "PUBLIC").map(({ method, value }) => ({ method, value }))
      : undefined;
    ranked.push({ score, result: { profileId: candidate.id, profileType: candidate.type, displayName: candidate.displayName, identityText: candidate.identityText, strength: strong ? "STRONG" : "PARTIAL", reasons: evidence.slice(0, 5), contacts, contactPreference: candidate.contactPreference } });
  }
  return ranked.sort((a, b) => b.score - a.score || a.result.displayName.localeCompare(b.result.displayName)).slice(0, 8).map(({ result }) => result);
}
