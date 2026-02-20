/*
  Warnings:

  - Added the required column `userRole` to the `school_teacher_roster` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "school_teacher_roster" ADD COLUMN     "userRole" "UserRole" NOT NULL;
