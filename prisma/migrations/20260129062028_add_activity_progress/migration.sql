-- CreateTable
CREATE TABLE "activity_progress" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "phqResultId" TEXT NOT NULL,
    "activityNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'locked',
    "unlockedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "scheduledDate" TIMESTAMP(3),
    "teacherId" TEXT,
    "teacherNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activity_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worksheet_uploads" (
    "id" TEXT NOT NULL,
    "activityProgressId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "worksheet_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "activity_progress_studentId_phqResultId_activityNumber_key" ON "activity_progress"("studentId", "phqResultId", "activityNumber");

-- AddForeignKey
ALTER TABLE "activity_progress" ADD CONSTRAINT "activity_progress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_progress" ADD CONSTRAINT "activity_progress_phqResultId_fkey" FOREIGN KEY ("phqResultId") REFERENCES "phq_results"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_progress" ADD CONSTRAINT "activity_progress_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worksheet_uploads" ADD CONSTRAINT "worksheet_uploads_activityProgressId_fkey" FOREIGN KEY ("activityProgressId") REFERENCES "activity_progress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worksheet_uploads" ADD CONSTRAINT "worksheet_uploads_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
