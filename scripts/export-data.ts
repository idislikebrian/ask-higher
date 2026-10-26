import { writeFile } from "node:fs/promises";
import { config } from "dotenv";

config({ path: ".env.local" });
config();

async function main() {
  const { prisma } = await import("@/lib/db");
  const output = process.argv[2] || "ask-higher-export.json";
  const profiles = await prisma.profile.findMany({ orderBy: { createdAt: "asc" }, include: { skills: { include: { skill: true } }, interests: { include: { interest: true } }, personProjectRelationships: { include: { projectProfile: true } }, asks: true, contacts: true, links: true, exclusions: true, consents: true, submissions: { orderBy: { createdAt: "asc" } } } });
  const payload = { format: "ask-higher-profile-export", version: 1, exportedAt: new Date().toISOString(), profiles: profiles.map((profile) => ({ id: profile.id, type: profile.type, displayName: profile.displayName, identityText: profile.identityText, timezone: profile.timezone, contactPreference: profile.contactPreference, status: profile.status, claimedAt: profile.claimedAt, publishedAt: profile.publishedAt, deletedAt: profile.deletedAt, createdAt: profile.createdAt, updatedAt: profile.updatedAt, skills: profile.skills.map(({ skill, originalText, source, createdAt }) => ({ canonicalName: skill.canonicalName, slug: skill.slug, originalText, source, createdAt })), interests: profile.interests.map(({ interest, originalText, source, createdAt }) => ({ canonicalName: interest.canonicalName, slug: interest.slug, originalText, source, createdAt })), projectRelationships: profile.personProjectRelationships.map(({ projectProfile, role, roleSource, originalRoleText, status, createdAt, updatedAt }) => ({ project: { id: projectProfile.id, type: projectProfile.type, displayName: projectProfile.displayName, identityText: projectProfile.identityText, status: projectProfile.status }, role, roleSource, originalRoleText, status, createdAt, updatedAt })), asks: profile.asks, contacts: profile.contacts, links: profile.links, exclusions: profile.exclusions, consents: profile.consents, submissions: profile.submissions })) };
  await writeFile(output, JSON.stringify(payload, null, 2));
  console.log(`Exported ${profiles.length} profiles to ${output}.`);
  await prisma.$disconnect();
}

void main();
