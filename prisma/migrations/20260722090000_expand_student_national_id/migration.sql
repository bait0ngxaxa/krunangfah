ALTER TABLE "students"
ALTER COLUMN "nationalId" TYPE VARCHAR(14);

ALTER TABLE "students"
ADD CONSTRAINT "students_national_id_format_check"
CHECK (
    "nationalId" IS NULL
    OR "nationalId" ~ '^([0-9]{13}|G[0-9]{13})$'
);
