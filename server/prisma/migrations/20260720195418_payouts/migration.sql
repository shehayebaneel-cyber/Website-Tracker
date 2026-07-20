-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "salespersonId" TEXT NOT NULL,
    "periodMonth" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "totalEarned" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalHeld" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAdjustments" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "netAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paidDate" TIMESTAMP(3),
    "method" TEXT,
    "reference" TEXT,
    "proofUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payout_code_key" ON "Payout"("code");

-- CreateIndex
CREATE INDEX "Payout_salespersonId_idx" ON "Payout"("salespersonId");

-- CreateIndex
CREATE INDEX "Payout_status_idx" ON "Payout"("status");

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "Payout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_salespersonId_fkey" FOREIGN KEY ("salespersonId") REFERENCES "Salesperson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
