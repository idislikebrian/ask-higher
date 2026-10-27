import { config } from "dotenv";
import type { ProfileDraft } from "@/lib/types";

config({ path: ".env.local" });
config();

function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }

async function main() {
  const { prisma } = await import("@/lib/db");
  const { normalizeProjectName } = await import("@/lib/projects");
  const { publishProfile } = await import("@/lib/persistence/publish");
  const userId = "project-duplicate-test-user";
  const projectOwnerId = "project-duplicate-test-owner";
  const existingId = "project-duplicate-existing";
  const distinctId = "project-duplicate-distinct";
  const uniqueId = "project-duplicate-unique";
  await prisma.user.deleteMany({ where: { id: { in: [userId, projectOwnerId] } } });
  await prisma.profile.deleteMany({ where: { id: { in: [existingId, distinctId, uniqueId] } } });
  await prisma.user.createMany({ data: [{ id: userId, name: "Project Duplicate Test", email: "project-duplicate-test@ask-higher.local" }, { id: projectOwnerId, name: "Project Owner Test", email: "project-owner-test@ask-higher.local" }] });
  await prisma.profile.create({ data: { id: existingId, type: "PROJECT", displayName: "Existing Project", identityText: "A project owned by another account.", status: "PUBLISHED", publishedAt: new Date(), owners: { create: { userId: projectOwnerId, role: "OWNER" } } } });
  assert(normalizeProjectName("  EXISTING   project ") === normalizeProjectName("Existing Project"), "Project name normalization failed.");
  const draft = (projects: ProfileDraft["selectedProjects"]): ProfileDraft => ({ type: "PERSON", displayName: "Project Duplicate Test", identity: "Testing project matching", capabilities: [{ id: "design", label: "Design", source: "custom" }], interests: [], projects: projects.map((project) => ({ profileId: "draft", projectId: project.id })), projectDetails: projects, selectedProjects: projects, createdProjects: projects.filter((project) => project.id !== existingId), customProjectDraft: "", capabilitiesText: "", interestsText: "", asks: [], timezone: "UTC", contacts: [], contactPreference: "INTRO_REQUESTS", links: [], exclusions: [], claimed: true, published: false, status: "DRAFT", capabilityRefined: false, skippedOptionalSteps: [] });
  const first = await publishProfile(draft([{ id: "new-client-id", name: " existing PROJECT ", description: "Should resolve to the existing project.", type: "PROJECT" }]), { version: 1 }, userId);
  const linked = await prisma.profileRelationship.findFirstOrThrow({ where: { personProfileId: first.id } });
  assert(linked.projectProfileId === existingId, "Normalized duplicate did not link to the existing project.");
  const second = await publishProfile(draft([{ id: distinctId, name: "Existing Project", description: "Intentionally distinct.", type: "PROJECT", allowDistinctName: true }, { id: uniqueId, name: "Unique New Project", description: "No existing match.", type: "PROJECT" }]), { version: 2 }, userId);
  assert(second.id === first.id, "Project duplicate test created a second person profile.");
  const links = await prisma.profileRelationship.findMany({ where: { personProfileId: first.id } });
  assert(links.some((link) => link.projectProfileId === distinctId), "Explicitly distinct project was not created.");
  assert(links.some((link) => link.projectProfileId === uniqueId), "No-match project was not created.");
  await prisma.profile.delete({ where: { id: first.id } });
  await prisma.profile.deleteMany({ where: { id: { in: [existingId, distinctId, uniqueId] } } });
  await prisma.user.deleteMany({ where: { id: { in: [userId, projectOwnerId] } } });
  console.log("Project duplicate invariants passed: exact/normalized match, cross-owner linking, intentional distinct creation, and no-match creation.");
  await prisma.$disconnect();
}

void main();
