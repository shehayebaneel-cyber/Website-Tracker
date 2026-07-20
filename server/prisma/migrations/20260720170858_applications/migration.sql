-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Application Received',
    "businessName" TEXT NOT NULL,
    "category" TEXT,
    "contactPerson" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "city" TEXT,
    "country" TEXT,
    "instagram" TEXT,
    "existingWebsite" TEXT,
    "isOperating" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "needType" TEXT,
    "plan" TEXT,
    "needs" JSONB,
    "otherFeatures" TEXT,
    "hasContent" JSONB,
    "files" JSONB,
    "launchTimeline" TEXT,
    "contactMethod" TEXT,
    "bestTime" TEXT,
    "meetingType" TEXT,
    "additionalInfo" TEXT,
    "hearAbout" TEXT,
    "referralCode" TEXT,
    "consentContact" BOOLEAN NOT NULL DEFAULT false,
    "priceMayChange" BOOLEAN NOT NULL DEFAULT false,
    "privacyAgreed" BOOLEAN NOT NULL DEFAULT false,
    "salespersonId" TEXT,
    "leadId" TEXT,
    "marketingSource" TEXT,
    "campaign" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archived" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Application_code_key" ON "Application"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Application_leadId_key" ON "Application"("leadId");

-- CreateIndex
CREATE INDEX "Application_status_idx" ON "Application"("status");

-- CreateIndex
CREATE INDEX "Application_salespersonId_idx" ON "Application"("salespersonId");

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_salespersonId_fkey" FOREIGN KEY ("salespersonId") REFERENCES "Salesperson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
