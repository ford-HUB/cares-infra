/*
  Warnings:

  - Added ADMIN to the enum `RoleType`.
  - The values [STAFF, ASSISTANT_COORDINATOR] on the enum `RoleType` are removed.
    Existing rows using them are remapped to COORDINATOR first.

*/
-- AlterEnum
BEGIN;
UPDATE "Role" SET "type" = 'COORDINATOR' WHERE "type" IN ('STAFF', 'ASSISTANT_COORDINATOR');
CREATE TYPE "RoleType_new" AS ENUM ('ADMIN', 'DIRECTOR', 'COORDINATOR', 'VOLUNTEER', 'DONOR', 'BENEFICIARY');
ALTER TABLE "public"."Role" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "Role" ALTER COLUMN "type" TYPE "RoleType_new" USING ("type"::text::"RoleType_new");
ALTER TYPE "RoleType" RENAME TO "RoleType_old";
ALTER TYPE "RoleType_new" RENAME TO "RoleType";
DROP TYPE "public"."RoleType_old";
ALTER TABLE "Role" ALTER COLUMN "type" SET DEFAULT 'VOLUNTEER';
COMMIT;
