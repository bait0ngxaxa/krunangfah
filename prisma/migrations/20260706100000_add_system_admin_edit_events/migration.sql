-- CreateEnum
CREATE TYPE "SystemAdminEventTargetType" AS ENUM ('school', 'student', 'user', 'teacher');

-- CreateEnum
CREATE TYPE "SystemAdminEventAction" AS ENUM ('EDIT');

-- CreateTable
CREATE TABLE "system_admin_events" (
    "id" TEXT NOT NULL,
    "targetType" "SystemAdminEventTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "action" "SystemAdminEventAction" NOT NULL,
    "reason" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "actorSnapshot" JSONB NOT NULL,
    "targetSnapshot" JSONB NOT NULL,
    "changes" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_admin_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "system_admin_events_targetType_targetId_createdAt_idx" ON "system_admin_events"("targetType", "targetId", "createdAt");

-- CreateIndex
CREATE INDEX "system_admin_events_actorUserId_createdAt_idx" ON "system_admin_events"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "system_admin_events_action_createdAt_idx" ON "system_admin_events"("action", "createdAt");
