-- CreateTable
CREATE TABLE "PricingPlan" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "heading" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "bestFor" TEXT,
    "basePrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "priceIsFrom" BOOLEAN NOT NULL DEFAULT false,
    "priceNote" TEXT NOT NULL DEFAULT '/month',
    "ctaLabel" TEXT NOT NULL DEFAULT 'Customize',
    "addOnHint" TEXT,
    "coreSystemMode" TEXT NOT NULL DEFAULT 'none',
    "bothSystemsPrice" DECIMAL(12,2),
    "includedSections" INTEGER,
    "includedUpdates" INTEGER NOT NULL DEFAULT 0,
    "includedProducts" INTEGER,
    "includedServices" INTEGER,
    "includedStaff" INTEGER,
    "includedLocations" INTEGER NOT NULL DEFAULT 1,
    "popular" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PricingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanInclusion" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "coreSystem" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PlanInclusion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AddOnCategory" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "blurb" TEXT,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AddOnCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AddOn" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "blurb" TEXT NOT NULL,
    "bestFor" TEXT,
    "icon" TEXT,
    "includes" TEXT[],
    "pricingType" TEXT NOT NULL DEFAULT 'monthly',
    "price" DECIMAL(12,2),
    "priceIsFrom" BOOLEAN NOT NULL DEFAULT true,
    "priceLabel" TEXT,
    "minPlan" TEXT NOT NULL DEFAULT 'standard',
    "includedInPlans" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bundledWith" TEXT,
    "recommendedFor" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "popular" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AddOn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AddOnDependency" (
    "id" TEXT NOT NULL,
    "addOnId" TEXT NOT NULL,
    "requiresType" TEXT NOT NULL DEFAULT 'addon',
    "requiresKey" TEXT NOT NULL,
    "note" TEXT,

    CONSTRAINT "AddOnDependency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapacityUpgrade" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unitLabel" TEXT NOT NULL,
    "stepSize" INTEGER NOT NULL,
    "pricePerStep" DECIMAL(12,2) NOT NULL,
    "maxSteps" INTEGER,
    "appliesToPlans" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requiresCoreSystem" TEXT,
    "helpText" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CapacityUpgrade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComparisonRow" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "basic" TEXT NOT NULL,
    "standard" TEXT NOT NULL,
    "premium" TEXT NOT NULL,
    "note" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ComparisonRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingFaq" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PricingFaq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingTerm" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'term',
    "title" TEXT,
    "body" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PricingTerm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessType" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "recommendedPlan" TEXT NOT NULL DEFAULT 'standard',
    "recommendedCore" TEXT,
    "priorityCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "priorityAddOns" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "BusinessType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanConfiguration" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'New',
    "contactName" TEXT,
    "businessName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "businessType" TEXT,
    "notes" TEXT,
    "planKey" TEXT NOT NULL,
    "coreSystem" TEXT,
    "capacities" JSONB,
    "selectedAddOns" JSONB,
    "quoteItems" JSONB,
    "monthlyTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "oneTimeTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "breakdown" JSONB,
    "salespersonId" TEXT,
    "leadId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'Plan Builder',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archived" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PlanConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PricingPlan_key_key" ON "PricingPlan"("key");

-- CreateIndex
CREATE INDEX "PricingPlan_active_order_idx" ON "PricingPlan"("active", "order");

-- CreateIndex
CREATE INDEX "PlanInclusion_planId_order_idx" ON "PlanInclusion"("planId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "AddOnCategory_key_key" ON "AddOnCategory"("key");

-- CreateIndex
CREATE UNIQUE INDEX "AddOn_key_key" ON "AddOn"("key");

-- CreateIndex
CREATE INDEX "AddOn_categoryId_order_idx" ON "AddOn"("categoryId", "order");

-- CreateIndex
CREATE INDEX "AddOn_active_idx" ON "AddOn"("active");

-- CreateIndex
CREATE INDEX "AddOnDependency_addOnId_idx" ON "AddOnDependency"("addOnId");

-- CreateIndex
CREATE UNIQUE INDEX "CapacityUpgrade_key_key" ON "CapacityUpgrade"("key");

-- CreateIndex
CREATE INDEX "PricingTerm_kind_order_idx" ON "PricingTerm"("kind", "order");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessType_key_key" ON "BusinessType"("key");

-- CreateIndex
CREATE UNIQUE INDEX "PlanConfiguration_code_key" ON "PlanConfiguration"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PlanConfiguration_leadId_key" ON "PlanConfiguration"("leadId");

-- CreateIndex
CREATE INDEX "PlanConfiguration_status_idx" ON "PlanConfiguration"("status");

-- AddForeignKey
ALTER TABLE "PlanInclusion" ADD CONSTRAINT "PlanInclusion_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PricingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AddOn" ADD CONSTRAINT "AddOn_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "AddOnCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AddOnDependency" ADD CONSTRAINT "AddOnDependency_addOnId_fkey" FOREIGN KEY ("addOnId") REFERENCES "AddOn"("id") ON DELETE CASCADE ON UPDATE CASCADE;
