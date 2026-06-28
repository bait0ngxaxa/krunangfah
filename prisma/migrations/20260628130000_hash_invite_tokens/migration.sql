CREATE EXTENSION IF NOT EXISTS pgcrypto;

UPDATE "teacher_invites"
SET "token" = encode(digest("token", 'sha256'), 'hex');

UPDATE "school_admin_invites"
SET "token" = encode(digest("token", 'sha256'), 'hex');
