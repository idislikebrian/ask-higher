import type { AskType, AskUrgency, ContactMethod, ContactPreference, ProfileDraft, ProfileProject, Project, Skill, Interest } from "@/lib/types";
import { isContactPreferenceValid } from "@/lib/profile";

type ValidationResult = { ok: true; draft: ProfileDraft } | { ok: false; errors: string[] };

const contactPreferences: Record<string, ContactPreference> = { DIRECT_CONTACT: "DIRECT_CONTACT", INTRO_REQUESTS: "INTRO_REQUESTS", BOTH: "BOTH", NOT_AVAILABLE: "NOT_AVAILABLE", "Direct contact": "DIRECT_CONTACT", "Intro requests": "INTRO_REQUESTS", Both: "BOTH", "Not available right now": "NOT_AVAILABLE" };
const askTypes: Record<string, AskType> = { COLLABORATORS: "Collaborators", Collaborators: "Collaborators", FEEDBACK: "Feedback", Feedback: "Feedback", DEVELOPER: "Developer", Developer: "Developer", DESIGNER: "Designer", Designer: "Designer", FUNDING: "Funding", Funding: "Funding", DISTRIBUTION: "Distribution", Distribution: "Distribution", INTRODUCTION: "Introduction", Introduction: "Introduction", OTHER: "Something else", "Something else": "Something else" };
const askUrgencies: Record<string, AskUrgency> = { EXPLORING: "Exploring", Exploring: "Exploring", ACTIVELY_LOOKING: "Actively looking", "Actively looking": "Actively looking", NEEDED_NOW: "Needed now", "Needed now": "Needed now" };
const contactMethods: Record<string, ContactMethod> = { TELEGRAM: "Telegram", Telegram: "Telegram", X: "X", FARCASTER: "Farcaster", Farcaster: "Farcaster", HIGHERIO: "Higherio", Higherio: "Higherio", EMAIL: "Email", Email: "Email", WEBSITE: "Website", Website: "Website" };

export function validatePublishPayload(input: unknown): ValidationResult {
  if (!input || typeof input !== "object") return { ok: false, errors: ["Request body must be an object."] };
  const value = input as Record<string, unknown>;
  const displayName = stringValue(value.displayName);
  const identity = stringValue(value.identity);
  const capabilities = normalizeTags(value.capabilities, "capability");
  const interests = normalizeTags(value.interests, "interest");
  const contactPreference = value.contactPreference == null ? null : contactPreferences[String(value.contactPreference)] || null;
  const contacts = Array.isArray(value.contacts) ? value.contacts.flatMap((contact) => { if (!contact || typeof contact !== "object") return []; const item = contact as Record<string, unknown>; const method = contactMethods[String(item.method)]; const contactValue = stringValue(item.value); return method && contactValue ? [{ method, value: contactValue }] : []; }) : [];
  const selectedProjects = Array.isArray(value.selectedProjects) ? value.selectedProjects.flatMap(normalizeProject) : [];
  const projects = Array.isArray(value.projects) ? value.projects.flatMap(normalizeRelationship) : [];
  const asks = Array.isArray(value.asks) ? value.asks.flatMap((ask) => { if (!ask || typeof ask !== "object") return []; const item = ask as Record<string, unknown>; const type = askTypes[String(item.type)]; const urgency = askUrgencies[String(item.urgency)]; const detail = stringValue(item.detail); return type && urgency && detail ? [{ id: stringValue(item.id) || `ask-${crypto.randomUUID()}`, type, detail, urgency }] : []; }) : [];
  const errors: string[] = [];
  if (value.type !== "PERSON") errors.push("The current intake can only publish PERSON profiles.");
  if (!displayName) errors.push("A display name is required.");
  if (!identity) errors.push("Identity text is required.");
  if (!capabilities.length) errors.push("At least one capability is required.");
  if (!contactPreference) errors.push("A contact preference is required.");
  if (contactPreference && !isContactPreferenceValid({ contactPreference, contacts })) errors.push("Direct contact and Both require at least one contact method.");
  if (value.directoryConsent !== true) errors.push("Directory consent is required before publishing.");
  if (!Array.isArray(value.selectedProjects) && value.selectedProjects !== undefined) errors.push("Projects must be an array.");
  if (!Array.isArray(value.asks) && value.asks !== undefined) errors.push("Asks must be an array.");
  if (errors.length) return { ok: false, errors };
  const draft: ProfileDraft = {
    type: "PERSON", displayName, identity, capabilities, interests, projects, projectDetails: selectedProjects, selectedProjects,
    createdProjects: selectedProjects.filter((project) => project.id.startsWith("project-")), customProjectDraft: "", capabilitiesText: stringValue(value.capabilitiesText), interestsText: stringValue(value.interestsText), asks,
    timezone: stringValue(value.timezone), contacts, contactPreference, links: normalizeLinks(value.links), exclusions: normalizeExclusions(value.exclusions), claimed: value.claimed === true, published: false, status: "DRAFT", capabilityRefined: value.capabilityRefined === true, skippedOptionalSteps: [],
  };
  return { ok: true, draft };
}

function stringValue(value: unknown): string { return typeof value === "string" ? value.trim() : ""; }
function normalizeTags(value: unknown, kind: "capability" | "interest"): Skill[] | Interest[] { if (!Array.isArray(value)) return []; return value.flatMap((tag) => { if (!tag || typeof tag !== "object") return []; const item = tag as Record<string, unknown>; const label = stringValue(item.label); if (!label) return []; return [{ id: stringValue(item.id) || `${kind}-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, label, source: item.source === "suggested" ? "suggested" : "custom", ...(stringValue(item.originalText) ? { originalText: stringValue(item.originalText) } : {}) } as Skill | Interest]; }); }
function normalizeProject(value: unknown): Project[] { if (!value || typeof value !== "object") return []; const item = value as Record<string, unknown>; const id = stringValue(item.id); const name = stringValue(item.name); const description = stringValue(item.description); return id && name && item.type === "PROJECT" ? [{ id, name, description, type: "PROJECT" }] : []; }
function normalizeRelationship(value: unknown): ProfileProject[] { if (!value || typeof value !== "object") return []; const item = value as Record<string, unknown>; const projectId = stringValue(item.projectId); if (!projectId) return []; return [{ profileId: "draft", projectId, ...(stringValue(item.role) ? { role: stringValue(item.role) } : {}), ...(item.roleSource === "suggested" || item.roleSource === "custom" ? { roleSource: item.roleSource } : {}), ...(stringValue(item.originalRoleText) ? { originalRoleText: stringValue(item.originalRoleText) } : {}) }]; }
function normalizeLinks(value: unknown): { label: string; url: string }[] { return Array.isArray(value) ? value.flatMap((link) => { if (!link || typeof link !== "object") return []; const item = link as Record<string, unknown>; const label = stringValue(item.label); const url = stringValue(item.url); return label && url ? [{ label, url }] : []; }) : []; }
function normalizeExclusions(value: unknown): { id: string; text: string }[] { return Array.isArray(value) ? value.flatMap((exclusion) => { if (!exclusion || typeof exclusion !== "object") return []; const item = exclusion as Record<string, unknown>; const text = stringValue(item.text); return text ? [{ id: stringValue(item.id) || `exclusion-${crypto.randomUUID()}`, text }] : []; }) : []; }
