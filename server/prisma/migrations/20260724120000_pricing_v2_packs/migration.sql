-- ---------------------------------------------------------------------------
-- Pricing v2: replace the fixed Basic/Standard/Premium model with an additive
-- one — a base website everyone gets, core systems priced in their own right,
-- and flat-priced feature packs.
--
-- The old catalogue is content, not customer data: it is dropped here and
-- re-seeded from prisma/pricingData.ts. Submitted configurations are NOT
-- touched — PlanConfiguration keeps its snapshot of what each customer was
-- actually shown, which is why planKey becomes nullable rather than going away.
--
-- Rows are cleared from the tables that gain NOT NULL columns, because their
-- contents describe plans that no longer exist.
-- ---------------------------------------------------------------------------
DELETE FROM "ComparisonRow";
DELETE FROM "BusinessType";
DELETE FROM "PricingFaq";
DELETE FROM "PricingTerm";

-- DropForeignKey
ALTER TABLE "AddOn" DROP CONSTRAINT "AddOn_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "AddOnDependency" DROP CONSTRAINT "AddOnDependency_addOnId_fkey";

-- DropForeignKey
ALTER TABLE "PlanInclusion" DROP CONSTRAINT "PlanInclusion_planId_fkey";

-- AlterTable
ALTER TABLE "BusinessType" DROP COLUMN "priorityAddOns",
DROP COLUMN "priorityCategories",
DROP COLUMN "recommendedCore",
DROP COLUMN "recommendedPlan",
ADD COLUMN     "priorityPacks" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "recommendedSystems" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "ComparisonRow" DROP COLUMN "basic",
DROP COLUMN "premium",
DROP COLUMN "standard",
ADD COLUMN     "booking" TEXT NOT NULL,
ADD COLUMN     "both" TEXT NOT NULL,
ADD COLUMN     "informational" TEXT NOT NULL,
ADD COLUMN     "store" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "PlanConfiguration" ADD COLUMN     "externalKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "oneTimeKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "packKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "systemKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "planKey" DROP NOT NULL;

-- DropTable
DROP TABLE "AddOn";

-- DropTable
DROP TABLE "AddOnCategory";

-- DropTable
DROP TABLE "AddOnDependency";

-- DropTable
DROP TABLE "CapacityUpgrade";

-- DropTable
DROP TABLE "PlanInclusion";

-- DropTable
DROP TABLE "PricingPlan";

-- CreateTable
CREATE TABLE "BaseWebsite" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL DEFAULT 'base',
    "name" TEXT NOT NULL,
    "heading" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "ctaLabel" TEXT NOT NULL DEFAULT 'Start with Informational',
    "price" DECIMAL(12,2) NOT NULL DEFAULT 10,
    "priceNote" TEXT NOT NULL DEFAULT '/month',
    "includedSections" INTEGER NOT NULL DEFAULT 6,
    "monthlyUpdates" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "BaseWebsite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BaseInclusion" (
    "id" TEXT NOT NULL,
    "baseId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "BaseInclusion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoreSystem" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "heading" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "ctaLabel" TEXT NOT NULL DEFAULT 'Add this system',
    "price" DECIMAL(12,2) NOT NULL DEFAULT 10,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CoreSystem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemInclusion" (
    "id" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "group" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SystemInclusion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemLimit" (
    "id" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "unitLabel" TEXT NOT NULL,
    "baseValue" INTEGER NOT NULL,
    "upgradedValue" INTEGER NOT NULL,
    "helpText" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SystemLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeaturePack" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "blurb" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL DEFAULT 5,
    "icon" TEXT,
    "requiresSystems" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "compatibleSystems" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requiresReason" TEXT,
    "raisesLimits" BOOLEAN NOT NULL DEFAULT false,
    "recommendedFor" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "FeaturePack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackFeature" (
    "id" TEXT NOT NULL,
    "packId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "group" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PackFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OneTimeService" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'setup',
    "startingPrice" DECIMAL(12,2),
    "isQuote" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "OneTimeService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalCost" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "provider" TEXT,
    "costType" TEXT NOT NULL DEFAULT 'usage',
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ExternalCost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendedSetup" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "systemKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "packKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "RecommendedSetup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingContent" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PricingContent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BaseWebsite_key_key" ON "BaseWebsite"("key");

-- CreateIndex
CREATE INDEX "BaseInclusion_baseId_order_idx" ON "BaseInclusion"("baseId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "CoreSystem_key_key" ON "CoreSystem"("key");

-- CreateIndex
CREATE INDEX "SystemInclusion_systemId_order_idx" ON "SystemInclusion"("systemId", "order");

-- CreateIndex
CREATE INDEX "SystemLimit_systemId_order_idx" ON "SystemLimit"("systemId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "SystemLimit_systemId_key_key" ON "SystemLimit"("systemId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "FeaturePack_key_key" ON "FeaturePack"("key");

-- CreateIndex
CREATE INDEX "PackFeature_packId_order_idx" ON "PackFeature"("packId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "OneTimeService_key_key" ON "OneTimeService"("key");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalCost_key_key" ON "ExternalCost"("key");

-- CreateIndex
CREATE UNIQUE INDEX "RecommendedSetup_key_key" ON "RecommendedSetup"("key");

-- CreateIndex
CREATE UNIQUE INDEX "PricingContent_key_key" ON "PricingContent"("key");

-- AddForeignKey
ALTER TABLE "BaseInclusion" ADD CONSTRAINT "BaseInclusion_baseId_fkey" FOREIGN KEY ("baseId") REFERENCES "BaseWebsite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemInclusion" ADD CONSTRAINT "SystemInclusion_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "CoreSystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemLimit" ADD CONSTRAINT "SystemLimit_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "CoreSystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackFeature" ADD CONSTRAINT "PackFeature_packId_fkey" FOREIGN KEY ("packId") REFERENCES "FeaturePack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

