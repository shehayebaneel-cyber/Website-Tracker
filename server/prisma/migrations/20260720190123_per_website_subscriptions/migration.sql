-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "websiteId" TEXT;

-- AlterTable
ALTER TABLE "Website" ADD COLUMN     "billingDay" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "monthlyFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "subscriptionActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "subscriptionStartDate" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Invoice_websiteId_idx" ON "Invoice"("websiteId");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE SET NULL ON UPDATE CASCADE;
