-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'system_admin';

-- CreateTable
CREATE TABLE "system_admin_whitelist" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_admin_whitelist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "system_admin_whitelist_email_key" ON "system_admin_whitelist"("email");
