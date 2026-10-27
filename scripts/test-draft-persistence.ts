import { config } from "dotenv";
import type { ProfileDraft } from "@/lib/types";

config({ path: ".env.local" });
config();

function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }

async function main() {
  const { prisma } = await import("@/lib/db");
  const { publishProfile, saveProfileDraft } = await import("@/lib/persistence/publish");
  const { validateDraftPayload } = await import("@/lib/persistence/validation");
  const userId = "draft-persistence-test-user";
  await prisma.user.deleteMany({ where: { id: userId } });
  await prisma.user.create({ data: { id: userId, name: "Draft Persistence Test", email: "draft-persistence-test@ask-higher.local" } });
  const draft: ProfileDraft = { type: "PERSON", displayName: "Draft Persistence Test", identity: "Testing durable claimed drafts", capabilities: [{ id: "research", label: "Research", source: "custom", originalText: "research" }], interests: [], projects: [], projectDetails: [], selectedProjects: [], createdProjects: [], customProjectDraft: "", capabilitiesText: "research", interestsText: "", asks: [], timezone: "UTC", contacts: [], contactPreference: "INTRO_REQUESTS", links: [], exclusions: [], claimed: true, published: false, status: "DRAFT", capabilityRefined: false, skippedOptionalSteps: [] };
  const first = await saveProfileDraft(draft, draft, userId);
  assert(first.state === "DRAFT", "Claim should create a private DRAFT profile.");
  const persisted = await prisma.profile.findUniqueOrThrow({ where: { id: first.profileId }, include: { owners: true, consents: true, submissions: true } });
  assert(persisted.status === "DRAFT", "Claimed draft became published.");
  assert(persisted.owners.length === 1, "Claimed draft did not create one owner.");
  assert(persisted.consents.length === 0, "Claimed draft created directory consent.");
  assert(persisted.submissions.length === 1, "Claimed draft snapshot was not stored.");
  const recovered = validateDraftPayload(persisted.submissions[0]?.rawPayload);
  assert(recovered.ok && recovered.draft.displayName === draft.displayName, "Server snapshot could not be recovered on another device.");
  const second = await saveProfileDraft(draft, { ...draft, marker: "refresh" }, userId);
  assert(second.profileId === first.profileId, "Refreshing a claimed draft created a duplicate profile.");
  const published = await publishProfile(draft, { ...draft, directoryConsent: true }, userId);
  assert(published.id === first.profileId, "Publish did not update the claimed draft profile.");
  const final = await prisma.profile.findUniqueOrThrow({ where: { id: first.profileId }, include: { owners: true, consents: true, submissions: true } });
  assert(final.status === "PUBLISHED", "Explicit publish did not publish the draft.");
  assert(final.owners.length === 1 && final.consents.filter((consent) => !consent.revokedAt).length === 1, "Publish changed ownership or consent unexpectedly.");
  assert(final.submissions.length === 3, "Draft and publish submission history was not preserved.");
  await prisma.profile.delete({ where: { id: first.profileId } });
  await prisma.user.delete({ where: { id: userId } });
  console.log("Draft persistence invariants passed: claim, recovery, refresh, explicit publish, ownership, and history.");
  await prisma.$disconnect();
}

void main();
