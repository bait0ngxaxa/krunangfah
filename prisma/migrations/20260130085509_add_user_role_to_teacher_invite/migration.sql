/*
  Warnings:

  - Added the required column `userRole` to the `teacher_invites` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "teacher_invites" ADD COLUMN     "userRole" TEXT NOT NULL;
