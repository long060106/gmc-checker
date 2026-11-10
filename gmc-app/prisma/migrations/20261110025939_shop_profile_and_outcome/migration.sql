-- AlterTable
ALTER TABLE "WaitlistEntry" ADD COLUMN "outcomeAnswer" TEXT;
ALTER TABLE "WaitlistEntry" ADD COLUMN "outcomeAnsweredAt" DATETIME;
ALTER TABLE "WaitlistEntry" ADD COLUMN "outcomeEmailSentAt" DATETIME;

-- CreateTable
CREATE TABLE "ShopProfile" (
    "shop" TEXT NOT NULL PRIMARY KEY,
    "gmcBusinessName" TEXT,
    "gmcPhone" TEXT,
    "gmcEmail" TEXT,
    "gmcAddress" TEXT,
    "outcomeSharingConsentAt" DATETIME,
    "updatedAt" DATETIME NOT NULL
);
