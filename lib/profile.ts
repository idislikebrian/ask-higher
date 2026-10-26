import type { Profile, ProfileDraft } from "./types";

export function profileFromDraft(draft: ProfileDraft, id = `profile-${Date.now()}`, createdAt = new Date().toISOString()): Profile {
  return {
    ...draft,
    id,
    createdAt,
    published: true,
    status: "PUBLISHED",
    projects: draft.selectedProjects.map((project) => ({ ...(draft.projects.find((relationship) => relationship.projectId === project.id) || { projectId: project.id }), profileId: id })),
    projectDetails: draft.selectedProjects,
  };
}

export function contactPreferenceNeedsMethod(preference: ProfileDraft["contactPreference"]): boolean {
  return preference === "DIRECT_CONTACT" || preference === "BOTH";
}

export function isContactPreferenceValid(draft: Pick<ProfileDraft, "contactPreference" | "contacts">): boolean {
  return !contactPreferenceNeedsMethod(draft.contactPreference) || draft.contacts.length > 0;
}

export function hasMinimumProfile(draft: ProfileDraft): boolean {
  return Boolean(draft.displayName.trim() && draft.identity.trim() && draft.capabilities.length);
}
