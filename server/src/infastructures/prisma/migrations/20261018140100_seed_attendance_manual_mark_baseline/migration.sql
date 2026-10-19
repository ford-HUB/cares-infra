-- Admins, directors and coordinators get manual attendance by default. Only roles that
-- already have stored baseline rows get one: a role with no rows falls back to the
-- catalog default, which already includes this right, and a lone row here would
-- replace that whole fallback.
INSERT INTO "RolePermissionDefault" ("role_permission_default_id", "role_type", "permission", "updatedAt")
SELECT gen_random_uuid()::text, roles."role_type", 'ATTENDANCE_MANUAL_MARK', CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT "role_type"
  FROM "RolePermissionDefault"
  WHERE "role_type" IN ('ADMIN', 'DIRECTOR', 'COORDINATOR')
) AS roles
ON CONFLICT ("role_type", "permission") DO NOTHING;
