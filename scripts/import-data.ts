import { readFile } from "node:fs/promises";
import { config } from "dotenv";

config({ path: ".env.local" });
config();

function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }

async function main() {
  const input = process.argv[2];
  assert(input, "Usage: npm run db:import -- <file>");
  const parsed: unknown = JSON.parse(await readFile(input, "utf8"));
  assert(parsed && typeof parsed === "object", "Export must be a JSON object.");
  const payload = parsed as { format?: unknown; version?: unknown; profiles?: unknown };
  assert(payload.format === "ask-higher-profile-export" && payload.version === 1 && Array.isArray(payload.profiles), "Unsupported or malformed Ask Higher export.");
  const { prisma } = await import("@/lib/db");
  await prisma.$transaction(async (tx) => {
    for (const raw of payload.profiles as Record<string, unknown>[]) {
      assert(typeof raw.id === "string" && typeof raw.displayName === "string" && typeof raw.type === "string", "Profile is missing required identity fields.");
      await tx.profile.upsert({ where: { id: raw.id }, update: { type: raw.type as never, displayName: raw.displayName, identityText: stringOrNull(raw.identityText), timezone: stringOrNull(raw.timezone), contactPreference: raw.contactPreference as never, status: raw.status as never, claimedAt: dateOrNull(raw.claimedAt), publishedAt: dateOrNull(raw.publishedAt), deletedAt: dateOrNull(raw.deletedAt) }, create: { id: raw.id, type: raw.type as never, displayName: raw.displayName, identityText: stringOrNull(raw.identityText), timezone: stringOrNull(raw.timezone), contactPreference: raw.contactPreference as never, status: raw.status as never, claimedAt: dateOrNull(raw.claimedAt), publishedAt: dateOrNull(raw.publishedAt), deletedAt: dateOrNull(raw.deletedAt) } });
      await tx.profileSkill.deleteMany({ where: { profileId: raw.id } });
      await tx.profileInterest.deleteMany({ where: { profileId: raw.id } });
      for (const skill of objects(raw.skills)) { const record = await tx.skill.upsert({ where: { slug: String(skill.slug) }, update: { canonicalName: String(skill.canonicalName) }, create: { slug: String(skill.slug), canonicalName: String(skill.canonicalName) } }); await tx.profileSkill.create({ data: { profileId: raw.id, skillId: record.id, originalText: stringOrNull(skill.originalText), source: skill.source as never } }); }
      for (const interest of objects(raw.interests)) { const record = await tx.interest.upsert({ where: { slug: String(interest.slug) }, update: { canonicalName: String(interest.canonicalName) }, create: { slug: String(interest.slug), canonicalName: String(interest.canonicalName) } }); await tx.profileInterest.create({ data: { profileId: raw.id, interestId: record.id, originalText: stringOrNull(interest.originalText), source: interest.source as never } }); }
      await tx.profileRelationship.deleteMany({ where: { personProfileId: raw.id } });
      await tx.ask.deleteMany({ where: { profileId: raw.id } });
      await tx.profileContact.deleteMany({ where: { profileId: raw.id } });
      await tx.profileLink.deleteMany({ where: { profileId: raw.id } });
      await tx.matchingExclusion.deleteMany({ where: { profileId: raw.id } });
      for (const relationship of objects(raw.projectRelationships)) { const project = relationship.project as Record<string, unknown> | undefined; if (!project || typeof project.id !== "string") continue; await tx.profile.upsert({ where: { id: project.id }, update: { type: "PROJECT", displayName: String(project.displayName), identityText: stringOrNull(project.identityText), status: project.status as never }, create: { id: project.id, type: "PROJECT", displayName: String(project.displayName), identityText: stringOrNull(project.identityText), status: project.status as never } }); await tx.profileRelationship.create({ data: { personProfileId: raw.id, projectProfileId: project.id, role: stringOrNull(relationship.role), roleSource: relationship.roleSource as never, originalRoleText: stringOrNull(relationship.originalRoleText), status: relationship.status as never } }); }
      for (const ask of objects(raw.asks)) await tx.ask.create({ data: { profileId: raw.id, type: ask.type as never, detail: String(ask.detail), urgency: ask.urgency as never, status: ask.status as never, createdAt: dateOrNull(ask.createdAt) || undefined, updatedAt: dateOrNull(ask.updatedAt) || undefined } });
      for (const contact of objects(raw.contacts)) await tx.profileContact.create({ data: { profileId: raw.id, type: contact.type as never, value: String(contact.value), preferred: contact.preferred === true, visibility: contact.visibility as never } });
      for (const link of objects(raw.links)) await tx.profileLink.create({ data: { profileId: raw.id, label: String(link.label), url: String(link.url) } });
      for (const exclusion of objects(raw.exclusions)) await tx.matchingExclusion.create({ data: { profileId: raw.id, text: String(exclusion.text) } });
      await tx.consentRecord.deleteMany({ where: { profileId: raw.id } });
      for (const consent of objects(raw.consents)) await tx.consentRecord.create({ data: { profileId: raw.id, type: consent.type as never, version: String(consent.version), grantedAt: dateOrNull(consent.grantedAt) || undefined, revokedAt: dateOrNull(consent.revokedAt) } });
      await tx.profileSubmission.deleteMany({ where: { profileId: raw.id } });
      for (const submission of objects(raw.submissions)) await tx.profileSubmission.create({ data: { profileId: raw.id, rawPayload: submission.rawPayload as never, createdAt: dateOrNull(submission.createdAt) || undefined } });
    }
  });
  console.log(`Imported ${payload.profiles.length} profiles from ${input}.`);
  await prisma.$disconnect();
}

function objects(value: unknown): Record<string, unknown>[] { return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object")) : []; }
function stringOrNull(value: unknown): string | null { return typeof value === "string" && value ? value : null; }
function dateOrNull(value: unknown): Date | null { return typeof value === "string" ? new Date(value) : null; }
void main();
