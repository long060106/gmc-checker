-- CreateTable
CREATE TABLE "RefundRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "test" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "refundedAt" DATETIME
);

-- CreateIndex
CREATE UNIQUE INDEX "RefundRequest_purchaseId_key" ON "RefundRequest"("purchaseId");

-- CreateIndex
CREATE INDEX "RefundRequest_shop_idx" ON "RefundRequest"("shop");
