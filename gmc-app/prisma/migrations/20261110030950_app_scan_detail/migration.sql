-- CreateTable
CREATE TABLE "AppScanDetail" (
    "scanId" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "findings" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "AppScanDetail_shop_createdAt_idx" ON "AppScanDetail"("shop", "createdAt");
