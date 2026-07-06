-- Extend RoleType with portal roles
ALTER TYPE "RoleType" ADD VALUE IF NOT EXISTS 'DIRECTOR';
ALTER TYPE "RoleType" ADD VALUE IF NOT EXISTS 'STAFF';
ALTER TYPE "RoleType" ADD VALUE IF NOT EXISTS 'COORDINATOR';
ALTER TYPE "RoleType" ADD VALUE IF NOT EXISTS 'ASSISTANT_COORDINATOR';

-- Promote legacy ADMIN rows to DIRECTOR before dropping admin_position
UPDATE "Role" SET type = 'DIRECTOR' WHERE type = 'ADMIN';

-- Remove separate admin position column and enum
ALTER TABLE "User" DROP COLUMN IF EXISTS "admin_position";
DROP TYPE IF EXISTS "AdminPosition";
