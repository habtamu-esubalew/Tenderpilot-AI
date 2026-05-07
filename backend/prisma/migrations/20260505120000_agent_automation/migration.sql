-- AlterTable
ALTER TABLE "Tender" ADD COLUMN "industry" TEXT;
ALTER TABLE "Tender" ADD COLUMN "location" TEXT;
ALTER TABLE "Tender" ADD COLUMN "estimatedEffort" TEXT;
ALTER TABLE "Tender" ADD COLUMN "urgencyLevel" TEXT;
ALTER TABLE "Tender" ADD COLUMN "confidence" TEXT;
ALTER TABLE "Tender" ADD COLUMN "nextBestAction" TEXT;
ALTER TABLE "Tender" ADD COLUMN "missingInformation" TEXT;
ALTER TABLE "Tender" ADD COLUMN "matchedServices" TEXT;
ALTER TABLE "Tender" ADD COLUMN "unmatchedRequirements" TEXT;
ALTER TABLE "Tender" ADD COLUMN "fitExplanation" TEXT;
ALTER TABLE "Tender" ADD COLUMN "automationPlan" TEXT;

-- AlterTable
ALTER TABLE "ChecklistItem" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'review';

-- CreateTable
CREATE TABLE "FinancialRequirement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenderId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinancialRequirement_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TechnicalRequirement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenderId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TechnicalRequirement_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RiskFlag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenderId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RiskFlag_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AgentActionLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenderId" TEXT,
    "actionType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgentActionLog_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "FinancialRequirement_tenderId_idx" ON "FinancialRequirement"("tenderId");

-- CreateIndex
CREATE INDEX "TechnicalRequirement_tenderId_idx" ON "TechnicalRequirement"("tenderId");

-- CreateIndex
CREATE INDEX "RiskFlag_tenderId_idx" ON "RiskFlag"("tenderId");

-- CreateIndex
CREATE INDEX "AgentActionLog_tenderId_idx" ON "AgentActionLog"("tenderId");
