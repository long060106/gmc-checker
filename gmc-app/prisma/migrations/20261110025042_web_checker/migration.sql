-- CreateTable
CREATE TABLE "Scan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopKey" TEXT NOT NULL,
    "engineVersion" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "results" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "gmcNameProvided" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "ReviewAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopKey" TEXT NOT NULL,
    "attemptNo" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "baselineScanId" TEXT NOT NULL,
    "snapshotScanId" TEXT,
    "requestedAt" DATETIME NOT NULL,
    "outcome" TEXT NOT NULL DEFAULT 'pending',
    "outcomeAt" DATETIME,
    "consentAt" DATETIME,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT
);

-- CreateTable
CREATE TABLE "AttemptFix" (
    "attemptId" TEXT NOT NULL,
    "checkId" TEXT NOT NULL,

    PRIMARY KEY ("attemptId", "checkId"),
    CONSTRAINT "AttemptFix_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "ReviewAttempt" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WaitlistEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scanId" TEXT,
    "suspended" BOOLEAN,
    "label" TEXT,
    "priceShown" INTEGER NOT NULL DEFAULT 3900,
    "outcomeEmailOptIn" BOOLEAN NOT NULL DEFAULT false,
    "outcomeEmailSendAfter" DATETIME,
    "outcomeToken" TEXT,
    "unsubscribed" BOOLEAN NOT NULL DEFAULT false
);

-- CreateIndex
CREATE INDEX "Scan_shopKey_createdAt_idx" ON "Scan"("shopKey", "createdAt");

-- CreateIndex
CREATE INDEX "ReviewAttempt_shopKey_idx" ON "ReviewAttempt"("shopKey");

-- CreateIndex
CREATE INDEX "ReviewAttempt_label_outcome_idx" ON "ReviewAttempt"("label", "outcome");

-- CreateIndex
CREATE UNIQUE INDEX "WaitlistEntry_email_key" ON "WaitlistEntry"("email");

-- CreateIndex
CREATE UNIQUE INDEX "WaitlistEntry_outcomeToken_key" ON "WaitlistEntry"("outcomeToken");
