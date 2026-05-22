CREATE TYPE "StudentStatus" AS ENUM (
    'ACTIVE',
    'RESIGNED',
    'TRANSFERRED',
    'GRADUATED'
);

ALTER TABLE "students"
ADD COLUMN "status" "StudentStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "statusChangedAt" TIMESTAMP(3),
ADD COLUMN "leftAt" TIMESTAMP(3);

CREATE TABLE "school_class_terms" (
    "id" TEXT NOT NULL,
    "schoolClassId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "expectedStudentCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "school_class_terms_pkey" PRIMARY KEY ("id")
);

INSERT INTO "school_class_terms" (
    "id",
    "schoolClassId",
    "academicYearId",
    "expectedStudentCount",
    "createdAt",
    "updatedAt"
)
SELECT
    'clst_' || md5(random()::text || clock_timestamp()::text || sc.id || ay.id),
    sc.id,
    ay.id,
    sc."expectedStudentCount",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "school_classes" sc
CROSS JOIN "academic_years" ay;

CREATE UNIQUE INDEX "school_class_terms_schoolClassId_academicYearId_key"
ON "school_class_terms"("schoolClassId", "academicYearId");

CREATE INDEX "school_class_terms_academicYearId_idx"
ON "school_class_terms"("academicYearId");

ALTER TABLE "school_class_terms"
ADD CONSTRAINT "school_class_terms_schoolClassId_fkey"
FOREIGN KEY ("schoolClassId") REFERENCES "school_classes"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "school_class_terms"
ADD CONSTRAINT "school_class_terms_academicYearId_fkey"
FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
