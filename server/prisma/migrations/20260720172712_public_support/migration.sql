-- DropForeignKey
ALTER TABLE "SupportTicket" DROP CONSTRAINT "SupportTicket_clientId_fkey";

-- AlterTable
ALTER TABLE "SupportTicket" ADD COLUMN     "browserInfo" TEXT,
ADD COLUMN     "businessImpact" TEXT,
ADD COLUMN     "deviceInfo" TEXT,
ADD COLUMN     "files" JSONB,
ADD COLUMN     "frequency" TEXT,
ADD COLUMN     "pageUrl" TEXT,
ADD COLUMN     "problemStarted" TEXT,
ADD COLUMN     "requestType" TEXT,
ADD COLUMN     "requesterBusiness" TEXT,
ADD COLUMN     "requesterEmail" TEXT,
ADD COLUMN     "requesterName" TEXT,
ADD COLUMN     "requesterPhone" TEXT,
ADD COLUMN     "requesterWebsite" TEXT,
ADD COLUMN     "stepsToReproduce" TEXT,
ALTER COLUMN "clientId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
