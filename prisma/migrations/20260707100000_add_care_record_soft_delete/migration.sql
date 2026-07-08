-- AlterEnum
ALTER TYPE "SystemAdminEventTargetType" ADD VALUE 'counselingSession';
ALTER TYPE "SystemAdminEventTargetType" ADD VALUE 'homeVisit';

-- AlterTable
ALTER TABLE "counseling_sessions"
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "deletedById" TEXT,
ADD COLUMN "deleteReason" TEXT;

-- AlterTable
ALTER TABLE "home_visits"
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "deletedById" TEXT,
ADD COLUMN "deleteReason" TEXT;

-- CreateIndex
CREATE INDEX "counseling_sessions_studentId_deletedAt_idx" ON "counseling_sessions"("studentId", "deletedAt");

-- CreateIndex
CREATE INDEX "home_visits_studentId_deletedAt_idx" ON "home_visits"("studentId", "deletedAt");
