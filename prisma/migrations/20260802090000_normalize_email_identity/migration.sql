-- Keep email identity values canonical before adding database-level guards.
-- Duplicate identities must be resolved explicitly rather than merging accounts
-- or roster entries implicitly during a production migration.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "users"
        GROUP BY LOWER(BTRIM("email"))
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Cannot normalize users.email: case-insensitive duplicate identities exist';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "system_admin_whitelist"
        GROUP BY LOWER(BTRIM("email"))
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Cannot normalize system_admin_whitelist.email: case-insensitive duplicates exist';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "school_admin_invites"
        GROUP BY LOWER(BTRIM("email"))
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Cannot normalize school_admin_invites.email: case-insensitive duplicates exist';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "school_teacher_roster"
        WHERE "email" IS NOT NULL
        GROUP BY "schoolId", LOWER(BTRIM("email"))
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Cannot normalize school_teacher_roster.email: case-insensitive duplicates exist within a school';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "password_reset_token"
        GROUP BY LOWER(BTRIM("email"))
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Cannot normalize password_reset_token.email: case-insensitive duplicates exist';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "teacher_invites"
        WHERE "acceptedAt" IS NULL
        GROUP BY LOWER(BTRIM("email"))
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Cannot normalize teacher_invites.email: case-insensitive pending duplicates exist';
    END IF;
END $$;

UPDATE "users"
SET "email" = LOWER(BTRIM("email"))
WHERE "email" <> LOWER(BTRIM("email"));

UPDATE "system_admin_whitelist"
SET "email" = LOWER(BTRIM("email"))
WHERE "email" <> LOWER(BTRIM("email"));

UPDATE "school_admin_invites"
SET "email" = LOWER(BTRIM("email"))
WHERE "email" <> LOWER(BTRIM("email"));

UPDATE "school_teacher_roster"
SET "email" = LOWER(BTRIM("email"))
WHERE "email" IS NOT NULL
  AND "email" <> LOWER(BTRIM("email"));

UPDATE "password_reset_token"
SET "email" = LOWER(BTRIM("email"))
WHERE "email" <> LOWER(BTRIM("email"));

UPDATE "teacher_invites"
SET "email" = LOWER(BTRIM("email"))
WHERE "email" <> LOWER(BTRIM("email"));

-- Prisma does not model expression indexes in the schema. These indexes keep
-- direct database writes from reintroducing case/whitespace variants.
CREATE UNIQUE INDEX "users_email_normalized_key"
ON "users" (LOWER(BTRIM("email")));

CREATE UNIQUE INDEX "system_admin_whitelist_email_normalized_key"
ON "system_admin_whitelist" (LOWER(BTRIM("email")));

CREATE UNIQUE INDEX "school_admin_invites_email_normalized_key"
ON "school_admin_invites" (LOWER(BTRIM("email")));

CREATE UNIQUE INDEX "school_teacher_roster_schoolId_email_normalized_key"
ON "school_teacher_roster" ("schoolId", LOWER(BTRIM("email")));

CREATE UNIQUE INDEX "password_reset_token_email_normalized_key"
ON "password_reset_token" (LOWER(BTRIM("email")));

CREATE UNIQUE INDEX "teacher_invites_pending_email_normalized_key"
ON "teacher_invites" (LOWER(BTRIM("email")))
WHERE "acceptedAt" IS NULL;
