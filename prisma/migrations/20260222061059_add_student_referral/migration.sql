-- CreateTable
CREATE TABLE "student_referrals" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "fromTeacherUserId" TEXT NOT NULL,
    "toTeacherUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_referrals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "student_referrals_studentId_key" ON "student_referrals"("studentId");

-- CreateIndex
CREATE INDEX "student_referrals_fromTeacherUserId_idx" ON "student_referrals"("fromTeacherUserId");

-- CreateIndex
CREATE INDEX "student_referrals_toTeacherUserId_idx" ON "student_referrals"("toTeacherUserId");

-- AddForeignKey
ALTER TABLE "student_referrals" ADD CONSTRAINT "student_referrals_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_referrals" ADD CONSTRAINT "student_referrals_fromTeacherUserId_fkey" FOREIGN KEY ("fromTeacherUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_referrals" ADD CONSTRAINT "student_referrals_toTeacherUserId_fkey" FOREIGN KEY ("toTeacherUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
