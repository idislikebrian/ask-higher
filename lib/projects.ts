import { prisma } from "@/lib/db";
import type { Project } from "@/lib/types";

export function normalizeProjectName(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

export async function findEligibleProjectNameMatches(name: string): Promise<Project[]> {
  const normalized = normalizeProjectName(name);
  if (!normalized) return [];
  const projects = await prisma.profile.findMany({ where: { type: "PROJECT", status: "PUBLISHED", deletedAt: null }, select: { id: true, displayName: true, identityText: true } });
  return projects.filter((project) => normalizeProjectName(project.displayName) === normalized).map((project) => ({ id: project.id, name: project.displayName, description: project.identityText || "", type: "PROJECT" }));
}
