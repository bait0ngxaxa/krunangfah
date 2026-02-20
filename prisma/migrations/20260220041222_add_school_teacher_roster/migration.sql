-- CreateTable
CREATE TABLE "school_teacher_roster" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "age" INTEGER NOT NULL,
    "advisoryClass" TEXT NOT NULL,
    "schoolRole" TEXT NOT NULL,
    "projectRole" "ProjectRole" NOT NULL,
    "inviteSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "school_teacher_roster_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "school_teacher_roster_schoolId_idx" ON "school_teacher_roster"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "school_teacher_roster_schoolId_email_key" ON "school_teacher_roster"("schoolId", "email");

-- AddForeignKey
ALTER TABLE "school_teacher_roster" ADD CONSTRAINT "school_teacher_roster_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
