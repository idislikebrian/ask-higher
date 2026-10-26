import { firstMissingRequiredStep, firstUnresolvedIntakeStep, nextIntakeStep } from "@/lib/intake-flow";
import { migrateDraft } from "@/lib/storage";
import type { ProfileDraft } from "@/lib/types";

function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }

const sequence = ["interests", "projects", "asks", "timezone", "preference", "contact", "links", "exclusions", "preview"] as const;
let current = "capabilities" as Parameters<typeof nextIntakeStep>[0];
for (const expected of sequence) { current = nextIntakeStep(current); assert(current === expected, `Expected ${expected}, got ${current}.`); }

const base = { timezone: "", contactPreference: null, contacts: [] as { method: "Telegram"; value: string }[] };
assert(firstMissingRequiredStep(base) === "timezone", "Timezone must be required before preview.");
assert(firstMissingRequiredStep({ ...base, timezone: "UTC" }) === "preference", "Open to must be required before preview.");
assert(firstMissingRequiredStep({ ...base, timezone: "UTC", contactPreference: "INTRO_REQUESTS" }) === null, "Intro requests should allow an omitted contact method.");
assert(firstMissingRequiredStep({ ...base, timezone: "UTC", contactPreference: "BOTH" }) === "contact", "Both must require a contact method.");
assert(firstMissingRequiredStep({ ...base, timezone: "UTC", contactPreference: "BOTH", contacts: [{ method: "Telegram", value: "@test" }] }) === null, "Both should pass with a contact method.");

const legacyJune = migrateDraft({
  type: "PERSON", displayName: "June", identity: "Community and creative work",
  capabilities: [{ id: "writing", label: "Writing", source: "custom", originalText: "Writing" }],
  interests: [{ id: "art", label: "Art", source: "suggested" }], projects: [], projectDetails: [], selectedProjects: [], createdProjects: [], customProjectDraft: "",
  capabilitiesText: "Writing", interestsText: "Art", asks: [], timezone: "America/New_York", contacts: [], contactPreference: "INTRO_REQUESTS", links: [], exclusions: [], claimed: false, published: false, status: "DRAFT", capabilityRefined: false,
}) as ProfileDraft | null;
assert(legacyJune !== null, "Legacy June draft did not migrate.");
assert(legacyJune.skippedOptionalSteps.length === 0, "Legacy draft incorrectly inferred optional skips.");
assert(firstUnresolvedIntakeStep(legacyJune) === "projects", "Legacy draft should resume at the first unresolved optional screen.");
const afterProjects = { ...legacyJune, selectedProjects: [{ id: "higher-zip", name: "HIGHER.ZIP", description: "A project", type: "PROJECT" as const }] };
assert(firstUnresolvedIntakeStep(afterProjects) === "asks", "Legacy draft should continue through unresolved asks.");
const afterAskSkip = { ...afterProjects, skippedOptionalSteps: ["asks"] as ProfileDraft["skippedOptionalSteps"] };
assert(firstUnresolvedIntakeStep(afterAskSkip) === "contact", "Legacy draft should still show unresolved optional contact methods.");
const afterContactSkip = { ...afterAskSkip, skippedOptionalSteps: ["asks", "contact"] as ProfileDraft["skippedOptionalSteps"] };
assert(firstUnresolvedIntakeStep(afterContactSkip) === "links", "Legacy draft should continue through unresolved links.");
const afterLinksSkip = { ...afterContactSkip, skippedOptionalSteps: ["asks", "contact", "links"] as ProfileDraft["skippedOptionalSteps"] };
assert(firstUnresolvedIntakeStep(afterLinksSkip) === "exclusions", "Legacy draft should continue through unresolved exclusions.");
const explicitlySkipped: ProfileDraft = { ...afterProjects, skippedOptionalSteps: ["projects", "asks", "contact", "links", "exclusions"] };
assert(firstUnresolvedIntakeStep(explicitlySkipped) === "preview", "Explicitly skipped screens should not reappear forever.");
console.log("Intake flow invariants passed for minimal, project-rich, no-ask, intro-only, and Both paths.");
