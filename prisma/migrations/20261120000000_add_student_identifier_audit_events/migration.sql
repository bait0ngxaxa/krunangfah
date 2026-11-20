CREATE TYPE "StudentIdentifierAuditAction" AS ENUM ('ADDED', 'REPLACED', 'CLEARED');

CREATE TABLE "student_identifier_audit_events" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "actorRole" "UserRole" NOT NULL,
    "action" "StudentIdentifierAuditAction" NOT NULL,
    "previousMasked" VARCHAR(14),
    "newMasked" VARCHAR(14),
    "reason" VARCHAR(1000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_identifier_audit_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "student_identifier_audit_school_admin" CHECK ("actorRole" = 'school_admin'),
    CONSTRAINT "student_identifier_audit_masks" CHECK (
        ("previousMasked" IS NULL OR "previousMasked" ~ '^G?[*]{9}[0-9]{4}$' OR "previousMasked" = '[ปิดบัง]') AND
        ("newMasked" IS NULL OR "newMasked" ~ '^G?[*]{9}[0-9]{4}$')
    ),
    CONSTRAINT "student_identifier_audit_action_values" CHECK (
        ("action" = 'ADDED' AND "previousMasked" IS NULL AND "newMasked" IS NOT NULL) OR
        ("action" = 'REPLACED' AND "previousMasked" IS NOT NULL AND "newMasked" IS NOT NULL) OR
        ("action" = 'CLEARED' AND "previousMasked" IS NOT NULL AND "newMasked" IS NULL)
    ),
    CONSTRAINT "student_identifier_audit_reason" CHECK (
        char_length(btrim("reason")) >= 3 AND regexp_replace("reason", '[-[:space:]]', '', 'g') !~ '[0-9]{13}'
    )
);

CREATE INDEX "student_identifier_audit_events_studentId_createdAt_idx"
    ON "student_identifier_audit_events"("studentId", "createdAt");
