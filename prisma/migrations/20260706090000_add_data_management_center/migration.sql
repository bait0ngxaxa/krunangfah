-- CreateEnum
CREATE TYPE "DataManagementTargetType" AS ENUM ('school', 'student');

-- CreateEnum
CREATE TYPE "DataManagementAction" AS ENUM ('MARK_TEST_DATA', 'UNMARK_TEST_DATA', 'DISABLE', 'RESTORE', 'PERMANENT_DELETE');

-- AlterTable
ALTER TABLE "schools"
ADD COLUMN "disabledAt" TIMESTAMP(3),
ADD COLUMN "disabledById" TEXT,
ADD COLUMN "disabledReason" TEXT,
ADD COLUMN "restoredAt" TIMESTAMP(3),
ADD COLUMN "restoredById" TEXT,
ADD COLUMN "restoreReason" TEXT,
ADD COLUMN "isTestData" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "testDataMarkedAt" TIMESTAMP(3),
ADD COLUMN "testDataMarkedById" TEXT,
ADD COLUMN "testDataReason" TEXT;

-- AlterTable
ALTER TABLE "students"
ADD COLUMN "disabledAt" TIMESTAMP(3),
ADD COLUMN "disabledById" TEXT,
ADD COLUMN "disabledReason" TEXT,
ADD COLUMN "restoredAt" TIMESTAMP(3),
ADD COLUMN "restoredById" TEXT,
ADD COLUMN "restoreReason" TEXT,
ADD COLUMN "isTestData" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "testDataMarkedAt" TIMESTAMP(3),
ADD COLUMN "testDataMarkedById" TEXT,
ADD COLUMN "testDataReason" TEXT;

-- CreateTable
CREATE TABLE "data_management_events" (
    "id" TEXT NOT NULL,
    "targetType" "DataManagementTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "action" "DataManagementAction" NOT NULL,
    "reason" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "actorSnapshot" JSONB NOT NULL,
    "targetSnapshot" JSONB NOT NULL,
    "impactSnapshot" JSONB NOT NULL,
    "warnings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "data_management_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "schools_disabledAt_idx" ON "schools"("disabledAt");

-- CreateIndex
CREATE INDEX "schools_isTestData_idx" ON "schools"("isTestData");

-- CreateIndex
CREATE INDEX "students_disabledAt_idx" ON "students"("disabledAt");

-- CreateIndex
CREATE INDEX "students_isTestData_idx" ON "students"("isTestData");

-- CreateIndex
CREATE INDEX "data_management_events_targetType_targetId_createdAt_idx" ON "data_management_events"("targetType", "targetId", "createdAt");

-- CreateIndex
CREATE INDEX "data_management_events_actorUserId_createdAt_idx" ON "data_management_events"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "data_management_events_action_createdAt_idx" ON "data_management_events"("action", "createdAt");
