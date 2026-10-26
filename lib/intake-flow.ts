import type { ContactPreference, IntakeOptionalStep, ProfileDraft } from "@/lib/types";

export type IntakeStep = "welcome" | "name" | "identity" | "capabilities" | "refine" | "interests" | "projects" | "asks" | "timezone" | "preference" | "contact" | "links" | "exclusions" | "preview";

export const intakeSteps: IntakeStep[] = ["name", "identity", "capabilities", "interests", "projects", "asks", "timezone", "preference", "contact", "links", "exclusions"];

export function shouldLoadCanonicalProfile(input: { ready: boolean; authenticated: boolean; hasInProgressAnonymousDraft: boolean; draftClaimed: boolean }): boolean {
  if (!input.ready || !input.authenticated) return false;
  return !(input.hasInProgressAnonymousDraft && input.draftClaimed);
}

export function nextIntakeStep(current: IntakeStep): IntakeStep {
  const index = intakeSteps.indexOf(current);
  return index >= 0 && index < intakeSteps.length - 1 ? intakeSteps[index + 1] : current === "exclusions" ? "preview" : "name";
}

export function firstMissingRequiredStep(draft: Pick<ProfileDraft, "timezone" | "contactPreference" | "contacts">): "timezone" | "preference" | "contact" | null {
  if (!draft.timezone.trim()) return "timezone";
  if (!draft.contactPreference) return "preference";
  if ((draft.contactPreference === "DIRECT_CONTACT" || draft.contactPreference === "BOTH") && draft.contacts.length === 0) return "contact";
  return null;
}

export function isContactMethodRequired(preference: ContactPreference | null): boolean {
  return preference === "DIRECT_CONTACT" || preference === "BOTH";
}

export function isOptionalStepResolved(step: IntakeOptionalStep, draft: Pick<ProfileDraft, "interests" | "selectedProjects" | "asks" | "contacts" | "links" | "exclusions" | "skippedOptionalSteps">): boolean {
  if (draft.skippedOptionalSteps.includes(step)) return true;
  if (step === "interests") return draft.interests.length > 0;
  if (step === "projects") return draft.selectedProjects.length > 0;
  if (step === "asks") return draft.asks.length > 0;
  if (step === "contact") return draft.contacts.length > 0;
  if (step === "links") return draft.links.length > 0;
  return draft.exclusions.length > 0;
}

export function firstUnresolvedIntakeStep(draft: ProfileDraft): IntakeStep | "preview" {
  if (!draft.displayName.trim()) return "name";
  if (!draft.identity.trim()) return "identity";
  if (!draft.capabilities.length) return "capabilities";
  if (draft.capabilities.some((capability) => ["Solidity", "Smart contracts"].includes(capability.label)) && !draft.capabilityRefined) return "refine";
  if (!isOptionalStepResolved("interests", draft)) return "interests";
  if (!isOptionalStepResolved("projects", draft)) return "projects";
  if (!isOptionalStepResolved("asks", draft)) return "asks";
  if (!draft.timezone.trim()) return "timezone";
  if (!draft.contactPreference) return "preference";
  if (isContactMethodRequired(draft.contactPreference) && !draft.contacts.length) return "contact";
  if (!isContactMethodRequired(draft.contactPreference) && !isOptionalStepResolved("contact", draft)) return "contact";
  if (!isOptionalStepResolved("links", draft)) return "links";
  if (!isOptionalStepResolved("exclusions", draft)) return "exclusions";
  return "preview";
}
