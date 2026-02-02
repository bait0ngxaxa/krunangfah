/*
  Warnings:

  - You are about to drop the column `schoolId` on the `teachers` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[studentId,schoolId]` on the table `students` will be added. If there are existing duplicate values, this will fail.
  - Made the column `studentId` on table `students` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "teachers" DROP CONSTRAINT "teachers_schoolId_fkey";

-- DropIndex
DROP INDEX "students_firstName_lastName_class_schoolId_key";

-- AlterTable
ALTER TABLE "students" ALTER COLUMN "studentId" SET NOT NULL;

-- AlterTable
ALTER TABLE "teachers" DROP COLUMN "schoolId";

-- CreateIndex
CREATE UNIQUE INDEX "students_studentId_schoolId_key" ON "students"("studentId", "schoolId");
