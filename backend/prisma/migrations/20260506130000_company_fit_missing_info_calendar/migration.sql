-- Normalize company fit + missing info into relations; persist calendar template/API links.
CREATE TABLE "CompanyFit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenderId" TEXT NOT NULL,
    "fitExplanation" TEXT NOT NULL,
    "matchedServices" TEXT NOT NULL,
    "unmatchedRequirements" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompanyFit_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "CompanyFit_tenderId_key" ON "CompanyFit"("tenderId");

CREATE TABLE "MissingInformation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenderId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MissingInformation_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "MissingInformation_tenderId_idx" ON "MissingInformation"("tenderId");

ALTER TABLE "Tender" ADD COLUMN "calendarLink" TEXT;

INSERT INTO "CompanyFit" ("id", "tenderId", "fitExplanation", "matchedServices", "unmatchedRequirements", "createdAt")
SELECT
    lower(hex(randomblob(16))),
    t."id",
    COALESCE(NULLIF(trim(t."fitExplanation"), ''), 'Imported from legacy row'),
    COALESCE(NULLIF(trim(t."matchedServices"), ''), '[]'),
    COALESCE(NULLIF(trim(t."unmatchedRequirements"), ''), '[]'),
    datetime('now')
FROM "Tender" t;

INSERT INTO "MissingInformation" ("id", "tenderId", "description", "createdAt")
SELECT lower(hex(randomblob(16))), t."id", trim(j.value), datetime('now')
FROM "Tender" t,
json_each(
  CASE
    WHEN json_valid(coalesce(t."missingInformation", '[]')) THEN coalesce(t."missingInformation", '[]')
    ELSE '[]'
  END
) AS j
WHERE typeof(j.value) = 'text'
  AND length(trim(j.value)) > 0;

ALTER TABLE "Tender" DROP COLUMN "missingInformation";
ALTER TABLE "Tender" DROP COLUMN "matchedServices";
ALTER TABLE "Tender" DROP COLUMN "unmatchedRequirements";
ALTER TABLE "Tender" DROP COLUMN "fitExplanation";
