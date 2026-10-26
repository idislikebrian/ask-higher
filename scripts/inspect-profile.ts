import { config } from "dotenv";

config({ path: ".env.local" });
config();

async function main() {
const { prisma } = await import("@/lib/db");

const name = process.argv[2] || "Brian";
const profile = await prisma.profile.findFirst({ where: { displayName: { equals: name, mode: "insensitive" } }, include: { skills: { include: { skill: true } }, interests: { include: { interest: true } }, personProjectRelationships: { include: { projectProfile: true } }, asks: true, contacts: true, exclusions: true, consents: true, submissions: { orderBy: { createdAt: "desc" }, take: 1 } } });
if (!profile) {
  console.error(`No profile found for ${name}.`);
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    id: profile.id,
    displayName: profile.displayName,
    type: profile.type,
    status: profile.status,
    identityText: profile.identityText,
    skills: profile.skills.map(({ skill, originalText, source }) => ({ canonicalName: skill.canonicalName, slug: skill.slug, originalText, source })),
    interests: profile.interests.map(({ interest, originalText, source }) => ({ canonicalName: interest.canonicalName, slug: interest.slug, originalText, source })),
    projects: profile.personProjectRelationships.map(({ projectProfile, role, roleSource, originalRoleText, status }) => ({ id: projectProfile.id, name: projectProfile.displayName, role, roleSource, originalRoleText, status })),
    asks: profile.asks.map(({ type, detail, urgency, status }) => ({ type, detail, urgency, status })),
    contacts: profile.contacts.map(({ type, value, preferred, visibility }) => ({ type, value, preferred, visibility })),
    exclusions: profile.exclusions.map(({ text }) => text),
    consents: profile.consents.map(({ type, version, grantedAt, revokedAt }) => ({ type, version, grantedAt, revokedAt })),
    latestSubmission: profile.submissions[0] ? { id: profile.submissions[0].id, createdAt: profile.submissions[0].createdAt, rawPayload: profile.submissions[0].rawPayload } : null,
  }, null, 2));
}
await prisma.$disconnect();
}

void main();
