import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isProfileDiscoverable } from "@/lib/persistence/discoverability";
import { rankCandidates, type MatchingCandidate } from "@/lib/matching/engine";
import type { AskHigherResponse } from "@/lib/matching/types";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { query?: unknown };
    if (typeof body.query !== "string" || body.query.trim().length < 3 || body.query.trim().length > 500) return NextResponse.json({ error: "Query must be between 3 and 500 characters." }, { status: 400 });
    const profiles = await prisma.profile.findMany({ where: { status: "PUBLISHED", deletedAt: null, consents: { some: { type: "DIRECTORY_SEARCH", revokedAt: null } } }, include: { skills: { include: { skill: true } }, interests: { include: { interest: true } }, asks: { where: { status: "ACTIVE" } }, contacts: true, exclusions: true, consents: true, personProjectRelationships: { where: { status: "ACTIVE" }, include: { projectProfile: true } } } });
    const candidates: MatchingCandidate[] = profiles.filter((profile) => isProfileDiscoverable({ status: profile.status, deletedAt: profile.deletedAt, identityText: profile.identityText, capabilityCount: profile.skills.length, hasActiveDirectoryConsent: profile.consents.some((consent) => !consent.revokedAt && consent.type === "DIRECTORY_SEARCH") })).map((profile) => ({ id: profile.id, type: profile.type, displayName: profile.displayName, identityText: profile.identityText || "", skills: profile.skills.map(({ skill, originalText }) => ({ id: skill.id, canonicalName: skill.canonicalName, originalText })), interests: profile.interests.map(({ interest, originalText }) => ({ id: interest.id, canonicalName: interest.canonicalName, originalText })), asks: profile.asks.map(({ id, type, detail, urgency }) => ({ id, type, detail, urgency })), projects: profile.personProjectRelationships.map(({ projectProfile, role, originalRoleText }) => ({ id: projectProfile.id, name: projectProfile.displayName, description: projectProfile.identityText || "", role, originalRoleText })), timezone: profile.timezone, contactPreference: profile.contactPreference, contacts: profile.contacts.map(({ type, value, visibility }) => ({ method: contactLabel(type), value, visibility })), exclusions: profile.exclusions.map(({ text }) => text) }));
    const matches = rankCandidates(body.query.trim(), candidates);
    const response: AskHigherResponse = { query: body.query.trim(), strength: matches.length ? matches.some((match) => match.strength === "STRONG") ? "STRONG" : "PARTIAL" : "NONE", matches };
    return NextResponse.json(response);
  } catch { return NextResponse.json({ error: "Ask Higher could not process that question." }, { status: 500 }); }
}

function contactLabel(value: string) { return ({ TELEGRAM: "Telegram", X: "X", FARCASTER: "Farcaster", HIGHERIO: "Higherio", EMAIL: "Email", WEBSITE: "Website" } as Record<string, "Telegram" | "X" | "Farcaster" | "Higherio" | "Email" | "Website">)[value] || "Website"; }
