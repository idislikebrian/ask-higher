import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth-server";
import { prisma } from "@/lib/db";
import { validateDraftPayload } from "@/lib/persistence/validation";

export async function GET() {
  try {
    const session = await requireSession();
    const owner = await prisma.profileOwner.findFirst({ where: { userId: session.user.id, role: "OWNER", profile: { type: "PERSON" } }, include: { profile: { include: { skills: { include: { skill: true } }, interests: { include: { interest: true } }, asks: true, contacts: true, links: true, exclusions: true, submissions: { orderBy: { createdAt: "desc" }, take: 1 }, personProjectRelationships: { include: { projectProfile: true } } } } } });
    if (!owner) return NextResponse.json({ profile: null });
    const profile = owner.profile;
    if (profile.status === "DRAFT") {
      const snapshot = profile.submissions[0]?.rawPayload;
      const draft = validateDraftPayload(snapshot);
      if (draft.ok) return NextResponse.json({ profile: { ...draft.draft, id: profile.id, claimed: true, published: false, status: "DRAFT", createdAt: profile.createdAt.toISOString() } });
    }
    return NextResponse.json({ profile: { id: profile.id, type: profile.type, displayName: profile.displayName, identity: profile.identityText || "", capabilities: profile.skills.map(({ skill, originalText, source }) => ({ id: skill.id, label: skill.canonicalName, source: source === "SUGGESTED" ? "suggested" : "custom", ...(originalText ? { originalText } : {}) })), interests: profile.interests.map(({ interest, originalText, source }) => ({ id: interest.id, label: interest.canonicalName, source: source === "SUGGESTED" ? "suggested" : "custom", ...(originalText ? { originalText } : {}) })), projects: profile.personProjectRelationships.map(({ personProfileId, projectProfileId, role, roleSource, originalRoleText }) => ({ profileId: personProfileId, projectId: projectProfileId, ...(role ? { role } : {}), ...(roleSource ? { roleSource: roleSource === "SUGGESTED" ? "suggested" : "custom" } : {}), ...(originalRoleText ? { originalRoleText } : {}) })), projectDetails: profile.personProjectRelationships.map(({ projectProfile }) => ({ id: projectProfile.id, name: projectProfile.displayName, description: projectProfile.identityText || "", type: projectProfile.type })), asks: profile.asks.map(({ id, type, detail, urgency }) => ({ id, type: askLabel(type), detail, urgency: urgencyLabel(urgency) })), timezone: profile.timezone || "", contacts: profile.contacts.map(({ type, value }) => ({ method: contactLabel(type), value })), contactPreference: profile.contactPreference, links: profile.links.map(({ label, url }) => ({ label, url })), exclusions: profile.exclusions.map(({ id, text }) => ({ id, text })), selectedProjects: profile.personProjectRelationships.map(({ projectProfile }) => ({ id: projectProfile.id, name: projectProfile.displayName, description: projectProfile.identityText || "", type: projectProfile.type })), createdProjects: [], customProjectDraft: "", capabilitiesText: "", interestsText: "", claimed: true, published: profile.status === "PUBLISHED", status: profile.status, capabilityRefined: false } });
  } catch (error) {
    if (error instanceof Error && error.message === "Authentication is required.") return NextResponse.json({ error: error.message }, { status: 401 });
    return NextResponse.json({ error: "Profile could not be loaded." }, { status: 500 });
  }
}

function askLabel(value: string) { return ({ COLLABORATORS: "Collaborators", FEEDBACK: "Feedback", DEVELOPER: "Developer", DESIGNER: "Designer", FUNDING: "Funding", DISTRIBUTION: "Distribution", INTRODUCTION: "Introduction", OTHER: "Something else" } as Record<string, string>)[value] || "Something else"; }
function urgencyLabel(value: string) { return ({ EXPLORING: "Exploring", ACTIVELY_LOOKING: "Actively looking", NEEDED_NOW: "Needed now" } as Record<string, string>)[value] || "Exploring"; }
function contactLabel(value: string) { return ({ TELEGRAM: "Telegram", X: "X", FARCASTER: "Farcaster", HIGHERIO: "Higherio", EMAIL: "Email", WEBSITE: "Website" } as Record<string, string>)[value] || "Website"; }
