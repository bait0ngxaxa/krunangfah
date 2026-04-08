WITH ranked_password_tokens AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY email
            ORDER BY "createdAt" DESC, id DESC
        ) AS row_num
    FROM "password_reset_token"
),
duplicate_password_tokens AS (
    SELECT id
    FROM ranked_password_tokens
    WHERE row_num > 1
)
DELETE FROM "password_reset_token"
WHERE id IN (SELECT id FROM duplicate_password_tokens);

WITH ranked_teacher_invites AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY email
            ORDER BY "createdAt" DESC, id DESC
        ) AS row_num
    FROM "teacher_invites"
    WHERE "acceptedAt" IS NULL
),
duplicate_teacher_invites AS (
    SELECT id
    FROM ranked_teacher_invites
    WHERE row_num > 1
)
DELETE FROM "teacher_invites"
WHERE id IN (SELECT id FROM duplicate_teacher_invites);

ALTER TABLE "password_reset_token"
ADD CONSTRAINT "password_reset_token_email_key" UNIQUE ("email");

CREATE UNIQUE INDEX "teacher_invites_pending_email_key"
ON "teacher_invites" ("email")
WHERE "acceptedAt" IS NULL;
