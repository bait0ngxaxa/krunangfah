-- Enforce structured reasons on new writes while preserving existing audit history.
ALTER TABLE "student_identifier_audit_events"
    ADD CONSTRAINT "student_identifier_audit_structured_reason" CHECK (
        ("action" IN ('ADDED', 'REPLACED') AND "reason" COLLATE "C" IN ('ISSUED', 'CORRECTION')) OR
        ("action" = 'CLEARED' AND "reason" COLLATE "C" = 'VERIFIED_REMOVAL')
    ) NOT VALID,
    DROP CONSTRAINT "student_identifier_audit_reason";
