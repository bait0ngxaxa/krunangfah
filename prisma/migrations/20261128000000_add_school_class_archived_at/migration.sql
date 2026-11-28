-- Additive and nullable: existing classes stay active (archivedAt IS NULL). No backfill.
ALTER TABLE "school_classes" ADD COLUMN "archivedAt" TIMESTAMP(3);
