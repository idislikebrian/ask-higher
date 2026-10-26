export type DiscoverabilityInput = {
  status: "DRAFT" | "PUBLISHED" | "HIDDEN";
  deletedAt: Date | null;
  identityText: string | null;
  capabilityCount: number;
  hasActiveDirectoryConsent: boolean;
};

export function isProfileDiscoverable(profile: DiscoverabilityInput): boolean {
  return profile.status === "PUBLISHED"
    && profile.deletedAt === null
    && Boolean(profile.identityText?.trim())
    && profile.capabilityCount > 0
    && profile.hasActiveDirectoryConsent;
}
