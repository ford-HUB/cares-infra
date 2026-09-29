-- AlterEnum
ALTER TYPE "LoginOutcome" ADD VALUE 'LOCKED_OUT';
ALTER TYPE "LoginOutcome" ADD VALUE 'OUTSIDE_LOGIN_HOURS';
ALTER TYPE "LoginOutcome" ADD VALUE 'IP_NOT_ALLOWED';

-- CreateTable
CREATE TABLE "SecurityPolicy" (
    "security_policy_id" TEXT NOT NULL,
    "singleton" BOOLEAN NOT NULL DEFAULT true,
    "password_min_length" INTEGER NOT NULL DEFAULT 8,
    "password_require_uppercase" BOOLEAN NOT NULL DEFAULT true,
    "password_require_lowercase" BOOLEAN NOT NULL DEFAULT true,
    "password_require_number" BOOLEAN NOT NULL DEFAULT true,
    "password_require_symbol" BOOLEAN NOT NULL DEFAULT false,
    "lockout_enabled" BOOLEAN NOT NULL DEFAULT true,
    "lockout_max_attempts" INTEGER NOT NULL DEFAULT 5,
    "lockout_window_minutes" INTEGER NOT NULL DEFAULT 15,
    "lockout_duration_minutes" INTEGER NOT NULL DEFAULT 30,
    "session_idle_timeout_minutes" INTEGER NOT NULL DEFAULT 0,
    "session_max_duration_hours" INTEGER NOT NULL DEFAULT 0,
    "max_concurrent_sessions" INTEGER NOT NULL DEFAULT 0,
    "login_hours_enabled" BOOLEAN NOT NULL DEFAULT false,
    "login_hours_start_minute" INTEGER NOT NULL DEFAULT 0,
    "login_hours_end_minute" INTEGER NOT NULL DEFAULT 1440,
    "ip_allowlist" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updated_by_user_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecurityPolicy_pkey" PRIMARY KEY ("security_policy_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SecurityPolicy_singleton_key" ON "SecurityPolicy"("singleton");
