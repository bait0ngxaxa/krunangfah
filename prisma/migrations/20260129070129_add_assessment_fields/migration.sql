-- AlterTable
ALTER TABLE "activity_progress" ADD COLUMN     "assessedAt" TIMESTAMP(3),
ADD COLUMN     "externalProblems" TEXT,
ADD COLUMN     "internalProblems" TEXT,
ADD COLUMN     "problemType" TEXT;
