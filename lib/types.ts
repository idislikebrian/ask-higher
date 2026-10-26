export type ProfileType = "PERSON" | "ORGANIZATION" | "PROJECT";
export type ProfileStatus = "DRAFT" | "PUBLISHED" | "HIDDEN";
export type AskType = "Collaborators" | "Feedback" | "Developer" | "Designer" | "Funding" | "Distribution" | "Introduction" | "Something else";
export type AskUrgency = "Exploring" | "Actively looking" | "Needed now";
export type ContactMethod = "Telegram" | "X" | "Farcaster" | "Higherio" | "Email" | "Website";
export type ContactPreference = "DIRECT_CONTACT" | "INTRO_REQUESTS" | "BOTH" | "NOT_AVAILABLE";
export type IntakeOptionalStep = "interests" | "projects" | "asks" | "contact" | "links" | "exclusions";

export interface Skill { id: string; label: string; source: "suggested" | "custom"; originalText?: string; }
export interface Interest { id: string; label: string; source: "suggested" | "custom"; originalText?: string; }
export interface Project { id: string; name: string; description: string; type: ProfileType; }
export interface ProfileProject { profileId: string; projectId: string; role?: string; roleSource?: "suggested" | "custom"; originalRoleText?: string; }
export interface Ask { id: string; type: AskType; detail: string; urgency: AskUrgency; }
export interface MatchingExclusion { id: string; text: string; }
export interface Profile {
  id: string; type: ProfileType; displayName: string; identity: string; capabilities: Skill[]; interests: Interest[];
  projects: ProfileProject[]; projectDetails: Project[]; asks: Ask[]; timezone: string; contacts: { method: ContactMethod; value: string }[];
  contactPreference: ContactPreference | null; links: { label: string; url: string }[]; exclusions: MatchingExclusion[]; status: ProfileStatus;
  claimed: boolean; published: boolean; createdAt: string;
}
export interface ProfileDraft extends Omit<Profile, "id" | "createdAt"> {
  selectedProjects: Project[]; createdProjects: Project[]; customProjectDraft: string;
  capabilitiesText: string; interestsText: string; capabilityRefined: boolean; skippedOptionalSteps: IntakeOptionalStep[];
}
