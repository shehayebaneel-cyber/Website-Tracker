-- AlterTable
ALTER TABLE "ClientAssignment" ADD COLUMN     "commissionAmount" DECIMAL(12,2),
ADD COLUMN     "commissionMethod" TEXT,
ADD COLUMN     "commissionPercent" DECIMAL(5,2);
