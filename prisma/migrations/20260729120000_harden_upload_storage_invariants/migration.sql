-- Reserve one of five database-backed slots for every home-visit photo.
ALTER TABLE "home_visit_photos"
ADD COLUMN "slot" INTEGER;

WITH ranked_photos AS (
    SELECT
        "id",
        ROW_NUMBER() OVER (
            PARTITION BY "homeVisitId"
            ORDER BY "uploadedAt" ASC, "id" ASC
        )::INTEGER AS "slot"
    FROM "home_visit_photos"
)
UPDATE "home_visit_photos" AS photo
SET "slot" = ranked."slot"
FROM ranked_photos AS ranked
WHERE photo."id" = ranked."id";

ALTER TABLE "home_visit_photos"
ALTER COLUMN "slot" SET NOT NULL;

ALTER TABLE "home_visit_photos"
ADD CONSTRAINT "home_visit_photos_slot_check"
CHECK ("slot" BETWEEN 1 AND 5);

CREATE UNIQUE INDEX "home_visit_photos_homeVisitId_slot_key"
ON "home_visit_photos"("homeVisitId", "slot");

CREATE UNIQUE INDEX "home_visit_photos_fileUrl_key"
ON "home_visit_photos"("fileUrl");

CREATE UNIQUE INDEX "worksheet_uploads_fileUrl_key"
ON "worksheet_uploads"("fileUrl");
