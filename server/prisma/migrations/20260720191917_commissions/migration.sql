-- CreateTable
CREATE TABLE "Commission" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "salespersonId" TEXT NOT NULL,
    "assignmentId" TEXT,
    "billingMonth" TIMESTAMP(3) NOT NULL,
    "subscriptionInvoiceId" TEXT,
    "basis" TEXT NOT NULL DEFAULT 'Collected',
    "method" TEXT NOT NULL DEFAULT 'Fixed',
    "subscriptionAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Expected',
    "statusReason" TEXT,
    "followUpId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "heldReason" TEXT,
    "payoutId" TEXT,
    "adjustment" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "adjustmentNote" TEXT,
    "reversedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Commission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Commission_code_key" ON "Commission"("code");

-- CreateIndex
CREATE INDEX "Commission_salespersonId_billingMonth_idx" ON "Commission"("salespersonId", "billingMonth");

-- CreateIndex
CREATE INDEX "Commission_status_idx" ON "Commission"("status");

-- CreateIndex
CREATE INDEX "Commission_clientId_idx" ON "Commission"("clientId");

-- CreateIndex
CREATE INDEX "Commission_payoutId_idx" ON "Commission"("payoutId");

-- CreateIndex
CREATE UNIQUE INDEX "Commission_websiteId_billingMonth_key" ON "Commission"("websiteId", "billingMonth");

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_salespersonId_fkey" FOREIGN KEY ("salespersonId") REFERENCES "Salesperson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ClientAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
