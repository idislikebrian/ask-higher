import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { normalizeProjectName } from "@/lib/projects";
import type { Profile, ProfileDraft } from "@/lib/types";

const consentVersion = "directory-search-v1";
const toDbAskTypeMap = { Collaborators: "COLLABORATORS", Feedback: "FEEDBACK", Developer: "DEVELOPER", Designer: "DESIGNER", Funding: "FUNDING", Distribution: "DISTRIBUTION", Introduction: "INTRODUCTION", "Something else": "OTHER" } as const;

export async function saveProfileDraft(draft: ProfileDraft, rawPayload: unknown, userId: string): Promise<{ state: "DRAFT" | "EXISTING_PROFILE"; profileId: string }> {
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const ownedPeople = await tx.profileOwner.findMany({ where: { userId, role: "OWNER", profile: { type: "PERSON" } }, include: { profile: true } });
    if (ownedPeople.length > 1) throw new Error("This user has more than one owned PERSON profile.");
    const existing = ownedPeople[0]?.profile;
    if (existing && existing.status !== "DRAFT") return { state: "EXISTING_PROFILE", profileId: existing.id };
    const profile = existing
      ? await tx.profile.update({ where: { id: existing.id }, data: { displayName: draft.displayName, identityText: draft.identity, timezone: draft.timezone || null, contactPreference: toDbContactPreference(draft.contactPreference), claimedAt: existing.claimedAt || now } })
      : await tx.profile.create({ data: { type: "PERSON", displayName: draft.displayName, identityText: draft.identity, timezone: draft.timezone || null, contactPreference: toDbContactPreference(draft.contactPreference), status: "DRAFT", claimedAt: now } });
    if (!existing) await tx.profileOwner.create({ data: { userId, profileId: profile.id, role: "OWNER" } });
    await tx.profileSubmission.create({ data: { profileId: profile.id, rawPayload: JSON.parse(JSON.stringify(rawPayload)) as Prisma.InputJsonValue } });
    return { state: "DRAFT", profileId: profile.id };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function publishProfile(draft: ProfileDraft, rawPayload: unknown, userId: string): Promise<Profile> {
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const ownedPeople = await tx.profileOwner.findMany({ where: { userId, role: "OWNER", profile: { type: "PERSON" } }, select: { profileId: true } });
    if (ownedPeople.length > 1) throw new Error("This user has more than one owned PERSON profile.");
    const existingId = ownedPeople[0]?.profileId;
    const profile = existingId
      ? await tx.profile.update({ where: { id: existingId }, data: { displayName: draft.displayName, identityText: draft.identity, timezone: draft.timezone || null, contactPreference: toDbContactPreference(draft.contactPreference), status: "PUBLISHED", claimedAt: { set: now }, publishedAt: now, deletedAt: null } })
      : await tx.profile.create({ data: { type: "PERSON", displayName: draft.displayName, identityText: draft.identity, timezone: draft.timezone || null, contactPreference: toDbContactPreference(draft.contactPreference), status: "PUBLISHED", claimedAt: now, publishedAt: now } });

    if (!existingId) await tx.profileOwner.create({ data: { userId, profileId: profile.id, role: "OWNER" } });
    await replaceProfileRelations(tx, profile.id, draft, now);
    await tx.consentRecord.updateMany({ where: { profileId: profile.id, type: "DIRECTORY_SEARCH", revokedAt: null }, data: { revokedAt: now } });
    await tx.consentRecord.create({ data: { profileId: profile.id, type: "DIRECTORY_SEARCH", version: consentVersion, grantedAt: now } });
    await tx.profileSubmission.create({ data: { profileId: profile.id, rawPayload: JSON.parse(JSON.stringify(rawPayload)) as Prisma.InputJsonValue } });

    return toProfile(profile, draft);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

async function replaceProfileRelations(tx: Prisma.TransactionClient, profileId: string, draft: ProfileDraft, now: Date) {
  await tx.profileSkill.deleteMany({ where: { profileId } });
  await tx.profileInterest.deleteMany({ where: { profileId } });
  await tx.profileRelationship.deleteMany({ where: { personProfileId: profileId } });
  await tx.ask.deleteMany({ where: { profileId } });
  await tx.profileContact.deleteMany({ where: { profileId } });
  await tx.matchingExclusion.deleteMany({ where: { profileId } });
  await tx.profileLink.deleteMany({ where: { profileId } });

  for (const capability of draft.capabilities) {
    const skill = await tx.skill.upsert({ where: { slug: slugify(capability.label) }, update: { canonicalName: capability.label }, create: { canonicalName: capability.label, slug: slugify(capability.label) } });
    await tx.profileSkill.create({ data: { profileId, skillId: skill.id, originalText: capability.originalText || null, source: capability.source === "suggested" ? "SUGGESTED" : "CUSTOM" } });
  }
  for (const interest of draft.interests) {
    const record = await tx.interest.upsert({ where: { slug: slugify(interest.label) }, update: { canonicalName: interest.label }, create: { canonicalName: interest.label, slug: slugify(interest.label) } });
    await tx.profileInterest.create({ data: { profileId, interestId: record.id, originalText: interest.originalText || null, source: interest.source === "suggested" ? "SUGGESTED" : "CUSTOM" } });
  }
  for (const project of draft.selectedProjects) {
    const existing = await tx.profile.findUnique({ where: { id: project.id } });
    if (existing && existing.type !== "PROJECT") throw new Error(`Project ${project.id} is not a PROJECT profile.`);
    const matchingProject = !existing && !project.allowDistinctName
      ? (await tx.profile.findMany({ where: { type: "PROJECT", status: "PUBLISHED", deletedAt: null }, select: { id: true, displayName: true, type: true } })).find((item) => normalizeProjectName(item.displayName) === normalizeProjectName(project.name))
      : null;
    const projectProfile = existing || matchingProject || await tx.profile.create({ data: { id: project.id, type: "PROJECT", displayName: project.name, identityText: project.description || null, status: "PUBLISHED", publishedAt: now } });
    if (projectProfile.type !== "PROJECT") throw new Error(`Project ${project.id} is not a PROJECT profile.`);
    const relationship = draft.projects.find((item) => item.projectId === project.id);
    await tx.profileRelationship.create({ data: { personProfileId: profileId, projectProfileId: projectProfile.id, role: relationship?.role || null, roleSource: relationship?.roleSource === "suggested" ? "SUGGESTED" : relationship?.roleSource === "custom" ? "CUSTOM" : null, originalRoleText: relationship?.originalRoleText || null } });
  }
  for (const ask of draft.asks) await tx.ask.create({ data: { profileId, type: toDbAskType(ask.type), detail: ask.detail, urgency: toDbAskUrgency(ask.urgency), status: "ACTIVE" } });
  for (const [index, contact] of draft.contacts.entries()) await tx.profileContact.create({ data: { profileId, type: toDbContactMethod(contact.method), value: contact.value, preferred: index === 0, visibility: "PUBLIC" } });
  for (const link of draft.links) await tx.profileLink.create({ data: { profileId, label: link.label, url: link.url } });
  for (const exclusion of draft.exclusions) await tx.matchingExclusion.create({ data: { profileId, text: exclusion.text } });
}

export async function setProfileVisibility(profileId: string, userId: string, status: "PUBLISHED" | "HIDDEN") {
  return prisma.$transaction(async (tx) => {
    await assertOwnedPerson(tx, profileId, userId);
    return tx.profile.update({ where: { id: profileId }, data: { status, deletedAt: status === "PUBLISHED" ? null : undefined, publishedAt: status === "PUBLISHED" ? new Date() : undefined } });
  });
}

export async function deleteOwnedProfile(profileId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    await assertOwnedPerson(tx, profileId, userId);
    return tx.profile.update({ where: { id: profileId }, data: { status: "HIDDEN", deletedAt: new Date() } });
  });
}

async function assertOwnedPerson(tx: Prisma.TransactionClient, profileId: string, userId: string) {
  const owner = await tx.profileOwner.findFirst({ where: { profileId, userId, role: { in: ["OWNER", "MANAGER"] }, profile: { type: "PERSON" } } });
  if (!owner) throw new Error("You do not own this profile.");
}

function toProfile(profile: { id: string; type: "PERSON" | "ORGANIZATION" | "PROJECT"; displayName: string; identityText: string | null; timezone: string | null; status: "DRAFT" | "PUBLISHED" | "HIDDEN"; claimedAt: Date | null; createdAt: Date }, draft: ProfileDraft): Profile {
  return { id: profile.id, type: profile.type, displayName: profile.displayName, identity: profile.identityText || "", capabilities: draft.capabilities, interests: draft.interests, projects: draft.selectedProjects.map((project) => ({ ...(draft.projects.find((relationship) => relationship.projectId === project.id) || { projectId: project.id }), profileId: profile.id })), projectDetails: draft.selectedProjects, asks: draft.asks, timezone: profile.timezone || "", contacts: draft.contacts, contactPreference: draft.contactPreference, links: draft.links, exclusions: draft.exclusions, claimed: Boolean(profile.claimedAt), published: profile.status === "PUBLISHED", status: profile.status, createdAt: profile.createdAt.toISOString() };
}

function slugify(value: string): string { return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "untitled"; }
function toDbContactPreference(value: ProfileDraft["contactPreference"]): "DIRECT_CONTACT" | "INTRO_REQUESTS" | "BOTH" | "NOT_AVAILABLE" { if (!value) throw new Error("Contact preference is required."); return value; }
function toDbAskType(value: string): "COLLABORATORS" | "FEEDBACK" | "DEVELOPER" | "DESIGNER" | "FUNDING" | "DISTRIBUTION" | "INTRODUCTION" | "OTHER" { return toDbAskTypeMap[value as keyof typeof toDbAskTypeMap] || "OTHER"; }
function toDbAskUrgency(value: string): "EXPLORING" | "ACTIVELY_LOOKING" | "NEEDED_NOW" { return ({ Exploring: "EXPLORING", "Actively looking": "ACTIVELY_LOOKING", "Needed now": "NEEDED_NOW" } as const)[value as "Exploring" | "Actively looking" | "Needed now"] || "EXPLORING"; }
function toDbContactMethod(value: string): "TELEGRAM" | "X" | "FARCASTER" | "HIGHERIO" | "EMAIL" | "WEBSITE" { return ({ Telegram: "TELEGRAM", X: "X", Farcaster: "FARCASTER", Higherio: "HIGHERIO", Email: "EMAIL", Website: "WEBSITE" } as const)[value as "Telegram" | "X" | "Farcaster" | "Higherio" | "Email" | "Website"]; }
