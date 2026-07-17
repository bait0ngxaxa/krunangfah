-- CreateTable
CREATE TABLE "file_deletion_outbox" (
    "id" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "file_deletion_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "file_deletion_outbox_fileUrl_key"
ON "file_deletion_outbox"("fileUrl");

-- CreateIndex
CREATE INDEX "file_deletion_outbox_processedAt_nextAttemptAt_idx"
ON "file_deletion_outbox"("processedAt", "nextAttemptAt");
