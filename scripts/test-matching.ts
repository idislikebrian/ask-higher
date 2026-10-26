import { rankCandidates } from "@/lib/matching/engine";
import type { MatchingCandidate } from "@/lib/matching/engine";

function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }

const base = (overrides: Partial<MatchingCandidate>): MatchingCandidate => ({ id: "profile", type: "PERSON", displayName: "Test profile", identityText: "A useful person", skills: [], interests: [], asks: [], projects: [], contacts: [], exclusions: [], contactPreference: "INTRO_REQUESTS", ...overrides });
const hardware = base({ id: "hardware", displayName: "June", skills: [{ id: "skill-hardware", canonicalName: "Hardware prototyping", originalText: "Hardware prototyping" }] });
const art = base({ id: "art", displayName: "Artist", interests: [{ id: "interest-art", canonicalName: "Art tooling", originalText: "Art tooling" }] });
const ask = base({ id: "ask", displayName: "Collaborator", asks: [{ id: "ask-1", type: "Collaborators", detail: "Looking for a designer for a new tool", urgency: "ACTIVELY_LOOKING" }] });
const project = base({ id: "project", type: "PROJECT", displayName: "HIGHER.ZIP", identityText: "A living archive for Higher projects", projects: [{ id: "higher-zip", name: "HIGHER.ZIP", description: "A living archive for Higher projects" }] });

const hardwareResults = rankCandidates("Who should I talk to about hardware?", [hardware, art]);
assert(hardwareResults[0]?.profileId === "hardware", "Direct capability match did not rank first.");
assert(hardwareResults[0].reasons.some((reason) => reason.sourceType === "CAPABILITY" && reason.submittedText === "Hardware prototyping"), "Capability evidence was not preserved.");
assert(rankCandidates("Who is interested in art tooling?", [art])[0]?.reasons.some((reason) => reason.sourceType === "INTEREST"), "Interest match was not returned.");
assert(rankCandidates("What projects are looking for collaborators?", [project, ask])[0]?.profileId === "ask" || rankCandidates("What projects are looking for collaborators?", [project, ask])[0]?.profileId === "project", "Project/contribution query returned no grounded result.");
assert(rankCandidates("Who can help with an unsupported marine biology domain?", [hardware, art]).length === 0, "Unsupported query manufactured a match.");
assert(rankCandidates("Who can help with hardware?", [base({ ...hardware, exclusions: ["hardware consulting"] })]).length === 0, "Matching exclusion did not suppress a match.");
console.log("Matching contract, evidence, ranking, contribution, exclusion, and no-match invariants passed.");
