-- Volunteers pick a participation role when they register for an event. Regular
-- needs no review; Organizer, Facilitator and Speaker file an EVENT_ROLE request
-- that a director or coordinator approves from the request queue.

-- CreateEnum
CREATE TYPE "EventParticipationRole" AS ENUM ('REGULAR', 'ORGANIZER', 'FACILITATOR', 'SPEAKER');

-- CreateEnum
CREATE TYPE "EventRoleApproval" AS ENUM ('APPROVED', 'PENDING', 'REJECTED');

-- AlterEnum
ALTER TYPE "UserRequestKind" ADD VALUE 'EVENT_ROLE';

-- AlterTable
ALTER TABLE "EventAttendance" ADD COLUMN     "participation_role" "EventParticipationRole" NOT NULL DEFAULT 'REGULAR',
ADD COLUMN     "role_approval" "EventRoleApproval" NOT NULL DEFAULT 'APPROVED';

-- AlterTable
ALTER TABLE "UserRequest" ADD COLUMN     "participation_role" "EventParticipationRole";

-- Coordinators now review event-role requests alongside directors, so they get the
-- request queue. Same rule as the USERS_REQUEST baseline: only a role that already
-- has stored rows gets one; a role with none falls back to the catalog default.
INSERT INTO "RolePermissionDefault" ("role_permission_default_id", "role_type", "permission", "updatedAt")
SELECT gen_random_uuid()::text, roles."role_type", 'USERS_REQUEST', CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT "role_type"
  FROM "RolePermissionDefault"
  WHERE "role_type" = 'COORDINATOR'
) AS roles
ON CONFLICT ("role_type", "permission") DO NOTHING;
