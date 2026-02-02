/*
  Warnings:

  - The `status` column on the `activity_progress` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `problemType` column on the `activity_progress` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `role` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `riskLevel` on the `phq_results` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `projectRole` on the `teacher_invites` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `userRole` on the `teacher_invites` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `projectRole` on the `teachers` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('school_admin', 'class_teacher');

-- CreateEnum
CREATE TYPE "ProjectRole" AS ENUM ('lead', 'care', 'coordinate');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('blue', 'green', 'yellow', 'orange', 'red');

-- CreateEnum
CREATE TYPE "ActivityStatus" AS ENUM ('locked', 'in_progress', 'pending_assessment', 'completed');

-- CreateEnum
CREATE TYPE "ProblemType" AS ENUM ('internal', 'external');

-- AlterTable
ALTER TABLE "activity_progress" DROP COLUMN "status",
ADD COLUMN     "status" "ActivityStatus" NOT NULL DEFAULT 'locked',
DROP COLUMN "problemType",
ADD COLUMN     "problemType" "ProblemType";

-- AlterTable
ALTER TABLE "phq_results" DROP COLUMN "riskLevel",
ADD COLUMN     "riskLevel" "RiskLevel" NOT NULL;

-- AlterTable
ALTER TABLE "teacher_invites" DROP COLUMN "projectRole",
ADD COLUMN     "projectRole" "ProjectRole" NOT NULL,
DROP COLUMN "userRole",
ADD COLUMN     "userRole" "UserRole" NOT NULL;

-- AlterTable
ALTER TABLE "teachers" DROP COLUMN "projectRole",
ADD COLUMN     "projectRole" "ProjectRole" NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "role",
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'class_teacher';
