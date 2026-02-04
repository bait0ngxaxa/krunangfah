-- CreateIndex
CREATE INDEX "students_schoolId_class_idx" ON "students"("schoolId", "class");

-- CreateIndex
CREATE INDEX "students_firstName_lastName_idx" ON "students"("firstName", "lastName");
