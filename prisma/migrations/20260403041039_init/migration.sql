-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('system_admin', 'school_admin', 'class_teacher');

-- CreateEnum
CREATE TYPE "ProjectRole" AS ENUM ('lead', 'care', 'coordinate');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('blue', 'green', 'yellow', 'orange', 'red');

-- CreateEnum
CREATE TYPE "ActivityStatus" AS ENUM ('locked', 'in_progress', 'pending_assessment', 'completed');

-- CreateEnum
CREATE TYPE "ProblemType" AS ENUM ('internal', 'external');

-- CreateEnum
CREATE TYPE "gender" AS ENUM ('MALE', 'FEMALE');

-- CreateTable
CREATE TABLE "schools" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "province" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_classes" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "school_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "password" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'school_admin',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "schoolId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_years" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "semester" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academic_years_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teachers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "advisoryClass" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "schoolRole" TEXT NOT NULL,
    "projectRole" "ProjectRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teachers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_invites" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "userRole" "UserRole" NOT NULL,
    "advisoryClass" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "schoolRole" TEXT NOT NULL,
    "projectRole" "ProjectRole" NOT NULL,
    "invitedById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teacher_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "gender" "gender",
    "age" INTEGER,
    "class" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phq_results" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "importedById" TEXT NOT NULL,
    "assessmentRound" INTEGER NOT NULL DEFAULT 1,
    "q1" INTEGER NOT NULL,
    "q2" INTEGER NOT NULL,
    "q3" INTEGER NOT NULL,
    "q4" INTEGER NOT NULL,
    "q5" INTEGER NOT NULL,
    "q6" INTEGER NOT NULL,
    "q7" INTEGER NOT NULL,
    "q8" INTEGER NOT NULL,
    "q9" INTEGER NOT NULL,
    "q9a" BOOLEAN NOT NULL DEFAULT false,
    "q9b" BOOLEAN NOT NULL DEFAULT false,
    "totalScore" INTEGER NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL,
    "referredToHospital" BOOLEAN NOT NULL DEFAULT false,
    "hospitalName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "phq_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_progress" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "phqResultId" TEXT NOT NULL,
    "activityNumber" INTEGER NOT NULL,
    "status" "ActivityStatus" NOT NULL DEFAULT 'locked',
    "unlockedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "scheduledDate" TIMESTAMP(3),
    "teacherId" TEXT,
    "teacherNotes" TEXT,
    "internalProblems" TEXT,
    "externalProblems" TEXT,
    "problemType" "ProblemType",
    "assessedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activity_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worksheet_uploads" (
    "id" TEXT NOT NULL,
    "activityProgressId" TEXT NOT NULL,
    "worksheetNumber" INTEGER NOT NULL DEFAULT 1,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "worksheet_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "counseling_sessions" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "sessionNumber" INTEGER NOT NULL,
    "sessionDate" TIMESTAMP(3) NOT NULL,
    "counselorName" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "counseling_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_admin_whitelist" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_admin_whitelist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_admin_invites" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'school_admin',
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "school_admin_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_teacher_roster" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "age" INTEGER NOT NULL,
    "userRole" "UserRole" NOT NULL,
    "advisoryClass" TEXT NOT NULL,
    "schoolRole" TEXT NOT NULL,
    "projectRole" "ProjectRole" NOT NULL,
    "inviteSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "school_teacher_roster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_token" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_referrals" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "fromTeacherUserId" TEXT NOT NULL,
    "toTeacherUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_referrals_pkey" PRIMARY KEY ("id")
);

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
CREATE INDEX "school_classes_schoolId_idx" ON "school_classes"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "school_classes_schoolId_name_key" ON "school_classes"("schoolId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "academic_years_year_semester_key" ON "academic_years"("year", "semester");

-- CreateIndex
CREATE UNIQUE INDEX "teachers_userId_key" ON "teachers"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_invites_token_key" ON "teacher_invites"("token");

-- CreateIndex
CREATE INDEX "students_schoolId_class_idx" ON "students"("schoolId", "class");

-- CreateIndex
CREATE INDEX "students_firstName_lastName_idx" ON "students"("firstName", "lastName");

-- CreateIndex
CREATE UNIQUE INDEX "students_studentId_schoolId_key" ON "students"("studentId", "schoolId");

-- CreateIndex
CREATE INDEX "phq_results_studentId_createdAt_idx" ON "phq_results"("studentId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "phq_results_studentId_academicYearId_assessmentRound_idx" ON "phq_results"("studentId", "academicYearId", "assessmentRound");

-- CreateIndex
CREATE INDEX "phq_results_academicYearId_idx" ON "phq_results"("academicYearId");

-- CreateIndex
CREATE UNIQUE INDEX "phq_results_studentId_academicYearId_assessmentRound_key" ON "phq_results"("studentId", "academicYearId", "assessmentRound");

-- CreateIndex
CREATE INDEX "activity_progress_phqResultId_status_idx" ON "activity_progress"("phqResultId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "activity_progress_studentId_phqResultId_activityNumber_key" ON "activity_progress"("studentId", "phqResultId", "activityNumber");

-- CreateIndex
CREATE UNIQUE INDEX "worksheet_uploads_activityProgressId_worksheetNumber_key" ON "worksheet_uploads"("activityProgressId", "worksheetNumber");

-- CreateIndex
CREATE UNIQUE INDEX "counseling_sessions_studentId_sessionNumber_key" ON "counseling_sessions"("studentId", "sessionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "system_admin_whitelist_email_key" ON "system_admin_whitelist"("email");

-- CreateIndex
CREATE UNIQUE INDEX "school_admin_invites_token_key" ON "school_admin_invites"("token");

-- CreateIndex
CREATE UNIQUE INDEX "school_admin_invites_email_key" ON "school_admin_invites"("email");

-- CreateIndex
CREATE INDEX "school_teacher_roster_schoolId_idx" ON "school_teacher_roster"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "school_teacher_roster_schoolId_email_key" ON "school_teacher_roster"("schoolId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_token_token_key" ON "password_reset_token"("token");

-- CreateIndex
CREATE INDEX "password_reset_token_email_idx" ON "password_reset_token"("email");

-- CreateIndex
CREATE INDEX "password_reset_token_token_idx" ON "password_reset_token"("token");

-- CreateIndex
CREATE UNIQUE INDEX "student_referrals_studentId_key" ON "student_referrals"("studentId");

-- CreateIndex
CREATE INDEX "student_referrals_fromTeacherUserId_idx" ON "student_referrals"("fromTeacherUserId");

-- CreateIndex
CREATE INDEX "student_referrals_toTeacherUserId_idx" ON "student_referrals"("toTeacherUserId");

-- CreateIndex
CREATE INDEX "home_visits_studentId_visitNumber_idx" ON "home_visits"("studentId", "visitNumber");

-- AddForeignKey
ALTER TABLE "school_classes" ADD CONSTRAINT "school_classes_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_invites" ADD CONSTRAINT "teacher_invites_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_invites" ADD CONSTRAINT "teacher_invites_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_invites" ADD CONSTRAINT "teacher_invites_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phq_results" ADD CONSTRAINT "phq_results_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phq_results" ADD CONSTRAINT "phq_results_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phq_results" ADD CONSTRAINT "phq_results_importedById_fkey" FOREIGN KEY ("importedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "counseling_sessions" ADD CONSTRAINT "counseling_sessions_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "counseling_sessions" ADD CONSTRAINT "counseling_sessions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_admin_invites" ADD CONSTRAINT "school_admin_invites_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_teacher_roster" ADD CONSTRAINT "school_teacher_roster_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_referrals" ADD CONSTRAINT "student_referrals_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_referrals" ADD CONSTRAINT "student_referrals_fromTeacherUserId_fkey" FOREIGN KEY ("fromTeacherUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_referrals" ADD CONSTRAINT "student_referrals_toTeacherUserId_fkey" FOREIGN KEY ("toTeacherUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "home_visits" ADD CONSTRAINT "home_visits_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "home_visits" ADD CONSTRAINT "home_visits_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "home_visit_photos" ADD CONSTRAINT "home_visit_photos_homeVisitId_fkey" FOREIGN KEY ("homeVisitId") REFERENCES "home_visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
