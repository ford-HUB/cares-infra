-- CreateEnum
CREATE TYPE "PermissionKey" AS ENUM ('USERS_VIEW', 'USERS_RESTRICT', 'USERS_BLOCK_IP', 'USERS_EXPORT', 'ACCESS_CONTROL_VIEW', 'ACCESS_CONTROL_MANAGE', 'EVENTS_VIEW', 'EVENTS_CREATE', 'EVENTS_UPDATE', 'EVENTS_DELETE', 'EVENTS_PUBLISH', 'ATTENDANCE_VIEW', 'ATTENDANCE_RECORD', 'ATTENDANCE_EXPORT', 'CERTIFICATES_VIEW', 'CERTIFICATES_TEMPLATE_MANAGE', 'CERTIFICATES_ISSUE', 'DONATIONS_VIEW', 'DONATIONS_RECORD', 'REPORTS_VIEW', 'REPORTS_PUBLISH', 'SECURITY_AUDIT_VIEW', 'SECURITY_SESSION_REVOKE', 'SECURITY_POLICY_MANAGE', 'SYSTEM_PERFORMANCE_VIEW', 'SYSTEM_NOTICE_MANAGE', 'SYSTEM_SERVICE_MANAGE', 'SYSTEM_MAINTENANCE_MANAGE', 'CHAT_ACCESS', 'MAIL_ACCESS', 'SUPPORT_TICKET_MANAGE');

-- CreateEnum
CREATE TYPE "PermissionOverrideEffect" AS ENUM ('GRANT', 'REVOKE');

-- CreateTable
CREATE TABLE "RolePermissionDefault" (
    "role_permission_default_id" TEXT NOT NULL,
    "role_type" "RoleType" NOT NULL,
    "permission" "PermissionKey" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RolePermissionDefault_pkey" PRIMARY KEY ("role_permission_default_id")
);

-- CreateTable
CREATE TABLE "UserPermissionOverride" (
    "user_permission_override_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "permission" "PermissionKey" NOT NULL,
    "effect" "PermissionOverrideEffect" NOT NULL,
    "reason" TEXT,
    "granted_by_user_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPermissionOverride_pkey" PRIMARY KEY ("user_permission_override_id")
);

-- CreateTable
CREATE TABLE "UserActionSuspension" (
    "user_action_suspension_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "permission" "PermissionKey" NOT NULL,
    "reason" TEXT NOT NULL,
    "issued_by_user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3),
    "lifted_at" TIMESTAMP(3),
    "lifted_by_user_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserActionSuspension_pkey" PRIMARY KEY ("user_action_suspension_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RolePermissionDefault_role_type_permission_key" ON "RolePermissionDefault"("role_type", "permission");

-- CreateIndex
CREATE INDEX "UserPermissionOverride_user_id_idx" ON "UserPermissionOverride"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "UserPermissionOverride_user_id_permission_key" ON "UserPermissionOverride"("user_id", "permission");

-- CreateIndex
CREATE INDEX "UserActionSuspension_user_id_idx" ON "UserActionSuspension"("user_id");

-- AddForeignKey
ALTER TABLE "UserPermissionOverride" ADD CONSTRAINT "UserPermissionOverride_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserActionSuspension" ADD CONSTRAINT "UserActionSuspension_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
