ALTER TABLE "students"
ADD COLUMN "nationalId" VARCHAR(13);

CREATE UNIQUE INDEX "students_nationalId_key" ON "students"("nationalId");
