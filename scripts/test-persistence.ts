import { config } from "dotenv";

config({ path: ".env.local" });
config();

async function main() {
const { prisma } = await import("@/lib/db");
const { validatePublishPayload } = await import("@/lib/persistence/validation");

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const basePayload = {
  type: "PERSON",
  displayName: "Test profile",
  identity: "Product design and creative technology",
  capabilities: [{ id: "product-design", label: "Product design", source: "suggested" }],
    interests: [{ id: "physical-computing", label: "Physical computing", source: "custom", originalText: "physical computing" }],
    contactPreference: "INTRO_REQUESTS",
    directoryConsent: true,
  asks: [
    { id: "ask-1", type: "Collaborators", detail: "A hardware collaborator", urgency: "Actively looking" },
    { id: "ask-2", type: "Feedback", detail: "Feedback on the prototype", urgency: "Exploring" },
  ],
};

const valid = validatePublishPayload(basePayload);
assert(valid.ok, valid.ok ? "" : valid.errors.join("; "));
assert(valid.draft.capabilities[0]?.originalText === undefined, "Canonical capability should not invent original wording.");
assert(valid.draft.interests[0]?.originalText === "physical computing", "Interest original wording was not preserved.");
assert(valid.draft.asks.length === 2, "Multiple asks were not preserved.");

  const invalidContact = validatePublishPayload({ ...basePayload, contactPreference: "BOTH", contacts: [] });
  assert(!invalidContact.ok, "BOTH without a contact method should be rejected.");
  const missingConsent = validatePublishPayload({ ...basePayload, directoryConsent: false });
  assert(!missingConsent.ok, "Publishing without explicit directory consent should be rejected.");

const profile = await prisma.profile.findFirst({
  where: { displayName: "Brian", type: "PERSON", status: "PUBLISHED" },
  orderBy: { createdAt: "desc" },
  include: {
    skills: { include: { skill: true } },
    interests: { include: { interest: true } },
    personProjectRelationships: { include: { projectProfile: true } },
    asks: true,
    consents: true,
    submissions: { orderBy: { createdAt: "desc" }, take: 1 },
  },
});
assert(profile, "Expected the persisted Brian verification profile.");
assert(profile.skills.some((item) => item.originalText === "Web development"), "Capability original wording was not persisted.");
assert(profile.interests.some((item) => item.interest.canonicalName === "Physical computing"), "Interest was not persisted.");
assert(profile.personProjectRelationships.some((item) => item.projectProfile.id === "higher-zip" && item.role === "Co-founder"), "Project relationship role was not persisted.");
assert(profile.asks.length === 2, "Persisted profile does not have both asks.");
assert(profile.consents.some((item) => item.type === "DIRECTORY_SEARCH" && !item.revokedAt), "Directory consent was not persisted.");
assert(profile.submissions[0]?.rawPayload !== undefined, "Raw submission payload was not persisted.");

const projectCount = await prisma.profile.count({ where: { type: "PROJECT", id: { in: ["higher-zip", "hb-canvas", "higherio", "rugclub"] } } });
assert(projectCount === 4, `Expected four seeded project profiles, found ${projectCount}.`);

console.log("Persistence invariants passed.");
await prisma.$disconnect();
}

void main();
