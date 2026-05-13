/*
  Warnings:

  - You are about to drop the column `academicYearId` on the `teacher_invites` table. All the data in the column will be lost.
  - You are about to drop the column `academicYearId` on the `teachers` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "teacher_invites" DROP CONSTRAINT "teacher_invites_academicYearId_fkey";

-- DropForeignKey
ALTER TABLE "teachers" DROP CONSTRAINT "teachers_academicYearId_fkey";

-- DropIndex
DROP INDEX "home_visits_studentId_visitNumber_idx";

-- AlterTable
ALTER TABLE "teacher_invites" DROP COLUMN "academicYearId";

-- AlterTable
ALTER TABLE "teachers" DROP COLUMN "academicYearId";
