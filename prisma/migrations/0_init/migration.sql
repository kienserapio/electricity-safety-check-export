-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ChecklistSection" AS ENUM ('EXTENT', 'VISUAL_INSPECTION', 'POLARITY', 'EARTH_CONTINUITY');

-- CreateEnum
CREATE TYPE "ItemState" AS ENUM ('INCLUDED', 'NOT_APPLICABLE', 'NOT_INCLUDED');

-- CreateEnum
CREATE TYPE "TestResult" AS ENUM ('PASS', 'FAIL', 'NA');

-- CreateTable
CREATE TABLE "SafetyCheck" (
    "id" TEXT NOT NULL,
    "serial" SERIAL NOT NULL,
    "address" TEXT NOT NULL,
    "previousCheckDate" DATE,
    "smokeAlarmsCompliant" BOOLEAN NOT NULL,
    "smokeAlarmDueDate" DATE NOT NULL,
    "observations" TEXT NOT NULL DEFAULT '',
    "electricianName" TEXT NOT NULL,
    "licenceNumber" TEXT NOT NULL,
    "inspectionDate" DATE NOT NULL,
    "nextInspectionDue" DATE NOT NULL,
    "signatureImage" TEXT NOT NULL,
    "signedDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SafetyCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistEntry" (
    "id" TEXT NOT NULL,
    "safetyCheckId" TEXT NOT NULL,
    "section" "ChecklistSection" NOT NULL,
    "itemKey" TEXT NOT NULL,
    "state" "ItemState" NOT NULL,

    CONSTRAINT "ChecklistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RcdTest" (
    "id" TEXT NOT NULL,
    "safetyCheckId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "circuit" TEXT NOT NULL,
    "pushButtonTest" "TestResult" NOT NULL,
    "timeTest" "TestResult" NOT NULL,

    CONSTRAINT "RcdTest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SafetyCheck_serial_key" ON "SafetyCheck"("serial");

-- CreateIndex
CREATE INDEX "SafetyCheck_address_idx" ON "SafetyCheck"("address");

-- CreateIndex
CREATE INDEX "SafetyCheck_inspectionDate_idx" ON "SafetyCheck"("inspectionDate");

-- CreateIndex
CREATE INDEX "SafetyCheck_nextInspectionDue_idx" ON "SafetyCheck"("nextInspectionDue");

-- CreateIndex
CREATE INDEX "ChecklistEntry_safetyCheckId_idx" ON "ChecklistEntry"("safetyCheckId");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistEntry_safetyCheckId_section_itemKey_key" ON "ChecklistEntry"("safetyCheckId", "section", "itemKey");

-- CreateIndex
CREATE INDEX "RcdTest_safetyCheckId_idx" ON "RcdTest"("safetyCheckId");

-- CreateIndex
CREATE UNIQUE INDEX "RcdTest_safetyCheckId_position_key" ON "RcdTest"("safetyCheckId", "position");

-- AddForeignKey
ALTER TABLE "ChecklistEntry" ADD CONSTRAINT "ChecklistEntry_safetyCheckId_fkey" FOREIGN KEY ("safetyCheckId") REFERENCES "SafetyCheck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RcdTest" ADD CONSTRAINT "RcdTest_safetyCheckId_fkey" FOREIGN KEY ("safetyCheckId") REFERENCES "SafetyCheck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

