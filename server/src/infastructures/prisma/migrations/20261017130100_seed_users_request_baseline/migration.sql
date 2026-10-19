-- Admins and directors could already open the request queue through USERS_VIEW, so
-- they keep it by default. Only roles that already have stored baseline rows get one:
-- a role with no rows falls back to the catalog default, which already includes this
-- right, and a lone row here would replace that whole fallback.
INSERT INTO "RolePermissionDefault" ("role_permission_default_id", "role_type", "permission", "updatedAt")
SELECT gen_random_uuid()::text, roles."role_type", 'USERS_REQUEST', CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT "role_type"
  FROM "RolePermissionDefault"
  WHERE "role_type" IN ('ADMIN', 'DIRECTOR')
) AS roles
ON CONFLICT ("role_type", "permission") DO NOTHING;
