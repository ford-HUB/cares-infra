-- CreateEnum
CREATE TYPE "LoginOutcome" AS ENUM ('SUCCESS', 'INVALID_CREDENTIALS', 'BLOCKED_IP', 'RESTRICTED_ACCOUNT', 'ROLE_NOT_ALLOWED');

-- CreateEnum
CREATE TYPE "LoginSource" AS ENUM ('PORTAL', 'MOBILE');

-- CreateTable
CREATE TABLE "LoginActivity" (
    "login_activity_id" TEXT NOT NULL,
    "user_id" TEXT,
    "email" TEXT NOT NULL,
    "ip_address" TEXT NOT NULL,
    "user_agent" TEXT,
    "source" "LoginSource" NOT NULL,
    "outcome" "LoginOutcome" NOT NULL,
    "failure_reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginActivity_pkey" PRIMARY KEY ("login_activity_id")
);

-- CreateIndex
CREATE INDEX "LoginActivity_user_id_idx" ON "LoginActivity"("user_id");

-- CreateIndex
CREATE INDEX "LoginActivity_createdAt_idx" ON "LoginActivity"("createdAt");

-- CreateIndex
CREATE INDEX "LoginActivity_ip_address_idx" ON "LoginActivity"("ip_address");

-- CreateIndex
CREATE INDEX "LoginActivity_email_idx" ON "LoginActivity"("email");

-- AddForeignKey
ALTER TABLE "LoginActivity" ADD CONSTRAINT "LoginActivity_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
