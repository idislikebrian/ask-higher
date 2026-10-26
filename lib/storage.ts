import type { ProfileDraft, Project } from "./types";
const KEY = "ask-higher-profile-draft-v1";
export function loadDraft(): ProfileDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(KEY);
    if (!value) return null;
    return migrateDraft(JSON.parse(value));
  } catch { return null; }
}

export function migrateDraft(value: unknown): ProfileDraft | null {
  if (!value || typeof value !== "object") return null;
  try {
    const parsed = value as Partial<ProfileDraft> & { projects?: unknown[] };
    const oldProjectObjects: Project[] = (parsed.projects as unknown[] | undefined || []).filter(isProject);
    const selectedProjects: Project[] = Array.isArray(parsed.selectedProjects) ? (parsed.selectedProjects as unknown[]).filter(isProject) : oldProjectObjects;
    const base: ProfileDraft = { type: "PERSON", displayName: "", identity: "", capabilities: [], interests: [], projects: [], projectDetails: [], selectedProjects: [], createdProjects: [], customProjectDraft: "", capabilitiesText: "", interestsText: "", asks: [], timezone: "", contacts: [], contactPreference: null, links: [], exclusions: [], claimed: false, published: false, status: "DRAFT", capabilityRefined: false, skippedOptionalSteps: [] };
    return {
      ...base,
      ...parsed,
      projects: Array.isArray(parsed.projects) && parsed.projects.every(isProfileProject) ? parsed.projects : selectedProjects.map((project) => ({ profileId: "draft", projectId: project.id })),
      projectDetails: Array.isArray(parsed.projectDetails) && parsed.projectDetails.length ? parsed.projectDetails.filter(isProject) : selectedProjects,
      selectedProjects,
      createdProjects: Array.isArray(parsed.createdProjects) ? parsed.createdProjects : [],
      contactPreference: normalizeContactPreference(parsed.contactPreference),
      capabilitiesText: parsed.capabilitiesText ?? "",
      interestsText: parsed.interestsText ?? "",
      skippedOptionalSteps: Array.isArray(parsed.skippedOptionalSteps)
        ? parsed.skippedOptionalSteps.filter((step): step is ProfileDraft["skippedOptionalSteps"][number] => ["interests", "projects", "asks", "contact", "links", "exclusions"].includes(step as string))
        : [],
    };
  } catch { return null; }
}
function isProject(value: unknown): value is Project { return Boolean(value && typeof value === "object" && "id" in value && "name" in value && "description" in value); }
function isProfileProject(value: unknown): value is ProfileDraft["projects"][number] { return Boolean(value && typeof value === "object" && "profileId" in value && "projectId" in value); }
function normalizeContactPreference(value: unknown): ProfileDraft["contactPreference"] { if (value === "Direct contact") return "DIRECT_CONTACT"; if (value === "Intro requests") return "INTRO_REQUESTS"; if (value === "Both") return "BOTH"; if (value === "Not available right now") return "NOT_AVAILABLE"; return value === "DIRECT_CONTACT" || value === "INTRO_REQUESTS" || value === "BOTH" || value === "NOT_AVAILABLE" ? value : null; }
export function saveDraft(draft: ProfileDraft) { if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(draft)); }
export function clearDraft() { if (typeof window !== "undefined") window.localStorage.removeItem(KEY); }
