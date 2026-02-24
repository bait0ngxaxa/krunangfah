-- CreateTable
CREATE TABLE "home_visits" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "visitNumber" INTEGER NOT NULL,
    "visitDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "nextScheduledDate" TIMESTAMP(3),
    "teacherName" TEXT NOT NULL,
    "teacherRole" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "home_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "home_visit_photos" (
    "id" TEXT NOT NULL,
    "homeVisitId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "home_visit_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "home_visits_studentId_visitNumber_idx" ON "home_visits"("studentId", "visitNumber");

-- AddForeignKey
ALTER TABLE "home_visits" ADD CONSTRAINT "home_visits_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "home_visits" ADD CONSTRAINT "home_visits_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "home_visit_photos" ADD CONSTRAINT "home_visit_photos_homeVisitId_fkey" FOREIGN KEY ("homeVisitId") REFERENCES "home_visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
