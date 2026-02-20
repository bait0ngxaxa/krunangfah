-- CreateTable
CREATE TABLE "school_admin_invites" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "school_admin_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "school_admin_invites_token_key" ON "school_admin_invites"("token");

-- CreateIndex
CREATE UNIQUE INDEX "school_admin_invites_email_key" ON "school_admin_invites"("email");

-- AddForeignKey
ALTER TABLE "school_admin_invites" ADD CONSTRAINT "school_admin_invites_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
