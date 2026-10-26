import { config } from "dotenv";
import { isProfileDiscoverable } from "@/lib/persistence/discoverability";
import type { ProfileDraft } from "@/lib/types";

config({ path: ".env.local" });
config();

function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }

async function main() {
  const { prisma } = await import("@/lib/db");
  const { deleteOwnedProfile, publishProfile, setProfileVisibility } = await import("@/lib/persistence/publish");
  const userId = "ownership-test-user";
  await prisma.user.upsert({ where: { id: userId }, update: {}, create: { id: userId, name: "Ownership Test", email: "ownership-test@ask-higher.local" } });
  const draft = (capability: string, ask: string): ProfileDraft => ({ type: "PERSON", displayName: "Ownership Test", identity: "Testing profile ownership", capabilities: [{ id: capability.toLowerCase(), label: capability, source: "custom", originalText: capability }], interests: [], projects: [], projectDetails: [], selectedProjects: [], createdProjects: [], customProjectDraft: "", capabilitiesText: capability, interestsText: "", asks: [{ id: `ask-${ask}`, type: "Collaborators", detail: ask, urgency: "Actively looking" }], timezone: "UTC", contacts: [], contactPreference: "INTRO_REQUESTS", links: [], exclusions: [], claimed: true, published: false, status: "DRAFT", capabilityRefined: false, skippedOptionalSteps: [] });
  const first = await publishProfile(draft("Hardware prototyping", "First ask"), { version: 1 }, userId);
  const second = await publishProfile(draft("Hardware systems", "Updated ask"), { version: 2 }, userId);
  assert(first.id === second.id, "Second publish created a duplicate person profile.");
  const persisted = await prisma.profile.findUniqueOrThrow({ where: { id: first.id }, include: { owners: true, skills: true, asks: true, submissions: true, consents: true } });
  assert(persisted.owners.length === 1, "Expected one ownership relationship.");
  assert(persisted.skills.length === 1 && persisted.asks.length === 1, "Relational update accumulated stale rows.");
  assert(persisted.submissions.length === 2, "Submission history was not preserved across updates.");
  assert(persisted.consents.filter((consent) => !consent.revokedAt).length === 1, "Expected one active consent record.");
  let unauthorized = false;
  try { await setProfileVisibility(first.id, "a-different-user", "HIDDEN"); } catch { unauthorized = true; }
  assert(unauthorized, "Unauthorized user modified the profile.");
  await setProfileVisibility(first.id, userId, "HIDDEN");
  const hidden = await prisma.profile.findUniqueOrThrow({ where: { id: first.id }, include: { consents: true, skills: true } });
  assert(!isProfileDiscoverable({ status: hidden.status, deletedAt: hidden.deletedAt, identityText: hidden.identityText, capabilityCount: hidden.skills.length, hasActiveDirectoryConsent: hidden.consents.some((consent) => !consent.revokedAt) }), "Hidden profile remained discoverable.");
  await setProfileVisibility(first.id, userId, "PUBLISHED");
  await deleteOwnedProfile(first.id, userId);
  const deleted = await prisma.profile.findUniqueOrThrow({ where: { id: first.id }, include: { consents: true, skills: true } });
  assert(deleted.deletedAt !== null && !isProfileDiscoverable({ status: deleted.status, deletedAt: deleted.deletedAt, identityText: deleted.identityText, capabilityCount: deleted.skills.length, hasActiveDirectoryConsent: deleted.consents.some((consent) => !consent.revokedAt) }), "Deleted profile remained discoverable.");
  await prisma.user.delete({ where: { id: userId } });
  console.log("Ownership, update, authorization, history, and discoverability invariants passed.");
  await prisma.$disconnect();
}

void main();
