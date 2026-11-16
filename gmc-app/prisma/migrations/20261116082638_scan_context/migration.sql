-- CreateTable
CREATE TABLE "ScanContext" (
    "scanId" TEXT NOT NULL PRIMARY KEY,
    "channel" TEXT,
    "suspended" TEXT,
    "label" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScanContext_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ScanContext_createdAt_idx" ON "ScanContext"("createdAt");
