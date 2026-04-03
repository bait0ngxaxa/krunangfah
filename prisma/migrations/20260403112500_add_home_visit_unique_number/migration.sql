-- Normalize duplicate visit numbers before adding unique index.
WITH home_visit_max AS (
    SELECT
        "studentId",
        COALESCE(MAX("visitNumber"), 0) AS max_number
    FROM "home_visits"
    GROUP BY "studentId"
),
home_visit_dups AS (
    SELECT
        ranked.id,
        ranked."studentId",
        ROW_NUMBER() OVER (
            PARTITION BY ranked."studentId"
            ORDER BY ranked."createdAt", ranked.id
        ) AS offset_number
    FROM (
        SELECT
            hv.id,
            hv."studentId",
            hv."createdAt",
            ROW_NUMBER() OVER (
                PARTITION BY hv."studentId", hv."visitNumber"
                ORDER BY hv."createdAt", hv.id
            ) AS dup_rank
        FROM "home_visits" hv
    ) ranked
    WHERE ranked.dup_rank > 1
)
UPDATE "home_visits" hv
SET "visitNumber" = hm.max_number + hd.offset_number
FROM home_visit_dups hd
JOIN home_visit_max hm
    ON hm."studentId" = hd."studentId"
WHERE hv.id = hd.id;

CREATE UNIQUE INDEX "home_visits_studentId_visitNumber_key"
ON "home_visits"("studentId", "visitNumber");
