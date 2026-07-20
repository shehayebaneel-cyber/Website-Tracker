-- CreateTable
CREATE TABLE "MonthlyFollowUp" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "salespersonId" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "contactedDate" TIMESTAMP(3),
    "method" TEXT,
    "satisfaction" TEXT,
    "needsUpdate" BOOLEAN NOT NULL DEFAULT false,
    "hasTechnicalIssue" BOOLEAN NOT NULL DEFAULT false,
    "mayCancel" BOOLEAN NOT NULL DEFAULT false,
    "upsellOpportunity" BOOLEAN NOT NULL DEFAULT false,
    "upsellNote" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Completed',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyFollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MonthlyFollowUp_salespersonId_month_idx" ON "MonthlyFollowUp"("salespersonId", "month");

-- CreateIndex
CREATE INDEX "MonthlyFollowUp_clientId_idx" ON "MonthlyFollowUp"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyFollowUp_clientId_month_key" ON "MonthlyFollowUp"("clientId", "month");

-- AddForeignKey
ALTER TABLE "MonthlyFollowUp" ADD CONSTRAINT "MonthlyFollowUp_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyFollowUp" ADD CONSTRAINT "MonthlyFollowUp_salespersonId_fkey" FOREIGN KEY ("salespersonId") REFERENCES "Salesperson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
