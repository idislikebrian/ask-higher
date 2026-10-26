import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: ".env.local" });
config();

const prisma = new PrismaClient();
const projects = [
  { id: "higher-zip", name: "HIGHER.ZIP", description: "A living archive and home for the Higher network." },
  { id: "hb-canvas", name: "HB Canvas", description: "A shared canvas for creative experiments and collaboration." },
  { id: "higherio", name: "Higherio", description: "A place to find people, projects, and ways to contribute." },
  { id: "rugclub", name: "Rugclub", description: "A community exploring internet-native culture together." },
];

async function main() {
  for (const project of projects) await prisma.profile.upsert({ where: { id: project.id }, update: { type: "PROJECT", displayName: project.name, identityText: project.description, status: "PUBLISHED" }, create: { id: project.id, type: "PROJECT", displayName: project.name, identityText: project.description, status: "PUBLISHED", publishedAt: new Date() } });
  console.log(`Seeded ${projects.length} Ask Higher project profiles.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
