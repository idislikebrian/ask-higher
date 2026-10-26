-- CreateEnum
CREATE TYPE "ProfileType" AS ENUM ('PERSON', 'ORGANIZATION', 'PROJECT');

-- CreateEnum
CREATE TYPE "ProfileStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'HIDDEN');

-- CreateEnum
CREATE TYPE "ContactPreference" AS ENUM ('DIRECT_CONTACT', 'INTRO_REQUESTS', 'BOTH', 'NOT_AVAILABLE');

-- CreateEnum
CREATE TYPE "SkillSource" AS ENUM ('SUGGESTED', 'CUSTOM');

-- CreateEnum
CREATE TYPE "RelationshipStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "AskType" AS ENUM ('COLLABORATORS', 'FEEDBACK', 'DEVELOPER', 'DESIGNER', 'FUNDING', 'DISTRIBUTION', 'INTRODUCTION', 'OTHER');

-- CreateEnum
CREATE TYPE "AskUrgency" AS ENUM ('EXPLORING', 'ACTIVELY_LOOKING', 'NEEDED_NOW');

-- CreateEnum
CREATE TYPE "AskStatus" AS ENUM ('ACTIVE', 'FULFILLED', 'PAUSED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ContactMethodType" AS ENUM ('TELEGRAM', 'X', 'FARCASTER', 'HIGHERIO', 'EMAIL', 'WEBSITE');

-- CreateEnum
CREATE TYPE "ContactVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('DIRECTORY_SEARCH');

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "type" "ProfileType" NOT NULL,
    "displayName" TEXT NOT NULL,
    "identityText" TEXT,
    "timezone" TEXT,
    "contactPreference" "ContactPreference",
    "status" "ProfileStatus" NOT NULL DEFAULT 'DRAFT',
    "claimedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "canonicalName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileSkill" (
    "profileId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "originalText" TEXT,
    "source" "SkillSource" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileSkill_pkey" PRIMARY KEY ("profileId","skillId")
);

-- CreateTable
CREATE TABLE "Interest" (
    "id" TEXT NOT NULL,
    "canonicalName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Interest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileInterest" (
    "profileId" TEXT NOT NULL,
    "interestId" TEXT NOT NULL,
    "originalText" TEXT,
    "source" "SkillSource" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileInterest_pkey" PRIMARY KEY ("profileId","interestId")
);

-- CreateTable
CREATE TABLE "ProfileRelationship" (
    "id" TEXT NOT NULL,
    "personProfileId" TEXT NOT NULL,
    "projectProfileId" TEXT NOT NULL,
    "role" TEXT,
    "roleSource" "SkillSource",
    "originalRoleText" TEXT,
    "status" "RelationshipStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ask" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "type" "AskType" NOT NULL,
    "detail" TEXT NOT NULL,
    "urgency" "AskUrgency" NOT NULL,
    "status" "AskStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileContact" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "type" "ContactMethodType" NOT NULL,
    "value" TEXT NOT NULL,
    "preferred" BOOLEAN NOT NULL DEFAULT false,
    "visibility" "ContactVisibility" NOT NULL DEFAULT 'PUBLIC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchingExclusion" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchingExclusion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileSubmission" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "rawPayload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentRecord" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "type" "ConsentType" NOT NULL,
    "version" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Profile_type_status_idx" ON "Profile"("type", "status");

-- CreateIndex
CREATE INDEX "Profile_status_publishedAt_idx" ON "Profile"("status", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_slug_key" ON "Skill"("slug");

-- CreateIndex
CREATE INDEX "ProfileSkill_skillId_idx" ON "ProfileSkill"("skillId");

-- CreateIndex
CREATE UNIQUE INDEX "Interest_slug_key" ON "Interest"("slug");

-- CreateIndex
CREATE INDEX "ProfileInterest_interestId_idx" ON "ProfileInterest"("interestId");

-- CreateIndex
CREATE INDEX "ProfileRelationship_projectProfileId_status_idx" ON "ProfileRelationship"("projectProfileId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileRelationship_personProfileId_projectProfileId_key" ON "ProfileRelationship"("personProfileId", "projectProfileId");

-- CreateIndex
CREATE INDEX "Ask_profileId_status_idx" ON "Ask"("profileId", "status");

-- CreateIndex
CREATE INDEX "ProfileContact_profileId_visibility_idx" ON "ProfileContact"("profileId", "visibility");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileContact_profileId_type_key" ON "ProfileContact"("profileId", "type");

-- CreateIndex
CREATE INDEX "MatchingExclusion_profileId_idx" ON "MatchingExclusion"("profileId");

-- CreateIndex
CREATE INDEX "ProfileSubmission_profileId_createdAt_idx" ON "ProfileSubmission"("profileId", "createdAt");

-- CreateIndex
CREATE INDEX "ConsentRecord_profileId_type_revokedAt_idx" ON "ConsentRecord"("profileId", "type", "revokedAt");

-- AddForeignKey
ALTER TABLE "ProfileSkill" ADD CONSTRAINT "ProfileSkill_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileSkill" ADD CONSTRAINT "ProfileSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileInterest" ADD CONSTRAINT "ProfileInterest_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileInterest" ADD CONSTRAINT "ProfileInterest_interestId_fkey" FOREIGN KEY ("interestId") REFERENCES "Interest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileRelationship" ADD CONSTRAINT "ProfileRelationship_personProfileId_fkey" FOREIGN KEY ("personProfileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileRelationship" ADD CONSTRAINT "ProfileRelationship_projectProfileId_fkey" FOREIGN KEY ("projectProfileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ask" ADD CONSTRAINT "Ask_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileContact" ADD CONSTRAINT "ProfileContact_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchingExclusion" ADD CONSTRAINT "MatchingExclusion_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileSubmission" ADD CONSTRAINT "ProfileSubmission_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
