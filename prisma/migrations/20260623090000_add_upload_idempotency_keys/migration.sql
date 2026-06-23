ALTER TABLE "worksheet_uploads"
ADD COLUMN "idempotencyKey" UUID;

CREATE UNIQUE INDEX "worksheet_uploads_idempotencyKey_key"
ON "worksheet_uploads"("idempotencyKey");

ALTER TABLE "home_visit_photos"
ADD COLUMN "idempotencyKey" UUID;

CREATE UNIQUE INDEX "home_visit_photos_idempotencyKey_key"
ON "home_visit_photos"("idempotencyKey");
