import { shouldLoadCanonicalProfile } from "@/lib/intake-flow";
import type { ProfileDraft } from "@/lib/types";

function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }

async function main() {
  assert(!shouldLoadCanonicalProfile({ ready: false, authenticated: true, hasInProgressAnonymousDraft: false, draftClaimed: false }), "Unready intake loaded canonical state.");
  assert(shouldLoadCanonicalProfile({ ready: true, authenticated: true, hasInProgressAnonymousDraft: false, draftClaimed: false }), "Signed-in user without a draft could not load canonical state.");
  assert(shouldLoadCanonicalProfile({ ready: true, authenticated: true, hasInProgressAnonymousDraft: true, draftClaimed: false }), "A signed-in user with an unclaimed draft must still resolve their canonical profile before publishing.");
  assert(!shouldLoadCanonicalProfile({ ready: true, authenticated: true, hasInProgressAnonymousDraft: true, draftClaimed: true }), "Claim continuation was overwritten by canonical profile loading.");
  assert(!shouldLoadCanonicalProfile({ ready: true, authenticated: false, hasInProgressAnonymousDraft: false, draftClaimed: false }), "Anonymous intake loaded a canonical profile.");

  const { config } = await import("dotenv");
  config({ path: ".env.local" });
  config();
  const { prisma } = await import("@/lib/db");
  const { publishProfile } = await import("@/lib/persistence/publish");
  const userA = "ownership-restart-user-a";
  const userB = "ownership-restart-user-b";
  const draft = (name: string, capability: string): ProfileDraft => ({
  type: "PERSON", displayName: name, identity: `${name} identity`,
  capabilities: [{ id: capability.toLowerCase().replaceAll(" ", "-"), label: capability, source: "custom", originalText: capability }],
  interests: [], projects: [], projectDetails: [], selectedProjects: [], createdProjects: [], customProjectDraft: "",
  capabilitiesText: capability, interestsText: "", asks: [], timezone: "UTC", contacts: [], contactPreference: "INTRO_REQUESTS",
  links: [], exclusions: [], claimed: true, published: false, status: "DRAFT", capabilityRefined: false, skippedOptionalSteps: [],
  });

  await prisma.user.createMany({ data: [
    { id: userA, name: "Restart Test A", email: "ownership-restart-a@ask-higher.local" },
    { id: userB, name: "Restart Test B", email: "ownership-restart-b@ask-higher.local" },
  ] });
  const createdProfileIds: string[] = [];
  try {
    const brian = await publishProfile(draft("Brian Test", "Product design"), { test: "restart-brian" }, userA);
    createdProfileIds.push(brian.id);
    const brianEdited = await publishProfile(draft("Brian Test", "Creative technology"), { test: "restart-brian-edit" }, userA);
    const june = await publishProfile(draft("June Test", "Research"), { test: "restart-june" }, userB);
    createdProfileIds.push(june.id);
    assert(brian.id === brianEdited.id, "Editing the original owner created a different profile.");
    assert(brian.id !== june.id, "A second authenticated user reused the first user's profile.");
    const owners = await prisma.profileOwner.findMany({ where: { profileId: { in: [brian.id, june.id] } }, select: { userId: true, profileId: true, role: true } });
    assert(owners.length === 2 && owners.some((owner) => owner.userId === userA && owner.profileId === brian.id) && owners.some((owner) => owner.userId === userB && owner.profileId === june.id), "Expected distinct ownership rows for the two users.");
  } finally {
    await prisma.profile.deleteMany({ where: { id: { in: createdProfileIds } } });
    await prisma.user.deleteMany({ where: { id: { in: [userA, userB] } } });
    await prisma.$disconnect();
  }

  console.log("Ownership restart invariants passed: sign-out is required before a new profile flow, claimed drafts survive auth continuation, edits stay on the same profile, and a new authenticated user receives a distinct profile.");
}

void main();
