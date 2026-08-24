-- CreateEnum
CREATE TYPE "AuditCategory" AS ENUM ('AUTHENTICATION', 'ACCESS_CONTROL', 'USER_MANAGEMENT', 'VERIFICATION', 'EVENT', 'CERTIFICATE', 'COMMUNICATION', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AuditSeverity" AS ENUM ('INFO', 'NOTICE', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AuditOutcome" AS ENUM ('SUCCESS', 'FAILURE', 'DENIED');

-- CreateEnum
CREATE TYPE "AuditSource" AS ENUM ('PORTAL', 'MOBILE', 'SYSTEM');

-- CreateTable
CREATE TABLE "AuditLog" (
    "audit_log_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "AuditCategory" NOT NULL,
    "severity" "AuditSeverity" NOT NULL DEFAULT 'INFO',
    "outcome" "AuditOutcome" NOT NULL DEFAULT 'SUCCESS',
    "actor_user_id" TEXT,
    "actor_name" TEXT NOT NULL,
    "actor_email" TEXT NOT NULL,
    "actor_role" "RoleType",
    "target_type" TEXT NOT NULL,
    "target_label" TEXT NOT NULL,
    "target_id" TEXT,
    "ip_address" TEXT NOT NULL,
    "user_agent" TEXT,
    "source" "AuditSource" NOT NULL DEFAULT 'PORTAL',
    "request_id" TEXT,
    "reason" TEXT,
    "changes" JSONB NOT NULL DEFAULT '[]',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("audit_log_id")
);

-- CreateIndex
CREATE INDEX "AuditLog_actor_user_id_idx" ON "AuditLog"("actor_user_id");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_category_idx" ON "AuditLog"("category");

-- CreateIndex
CREATE INDEX "AuditLog_severity_idx" ON "AuditLog"("severity");

-- CreateIndex
CREATE INDEX "AuditLog_outcome_idx" ON "AuditLog"("outcome");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
