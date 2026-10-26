import type { ContactMethod, ContactPreference, ProfileType } from "@/lib/types";

export type MatchStrength = "STRONG" | "PARTIAL" | "NONE";

export type MatchEvidence = {
  sourceType: "CAPABILITY" | "INTEREST" | "IDENTITY" | "ASK" | "PROJECT" | "PROJECT_ROLE" | "TIMEZONE";
  sourceId?: string;
  submittedText: string;
  canonicalValue?: string;
};

export type PublicContact = { method: ContactMethod; value: string };

export type MatchResult = {
  profileId: string;
  profileType: ProfileType;
  displayName: string;
  identityText: string;
  strength: "STRONG" | "PARTIAL";
  reasons: MatchEvidence[];
  profilePath?: string;
  contacts?: PublicContact[];
  contactPreference?: ContactPreference | null;
};

export type AskHigherResponse = {
  query: string;
  strength: MatchStrength;
  matches: MatchResult[];
};
