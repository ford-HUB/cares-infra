/*
  Warnings:

  - The values [ADMIN] on the enum `RoleType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "RoleType_new" AS ENUM ('DIRECTOR', 'STAFF', 'COORDINATOR', 'ASSISTANT_COORDINATOR', 'VOLUNTEER', 'DONOR', 'BENEFICIARY');
ALTER TABLE "public"."Role" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "Role" ALTER COLUMN "type" TYPE "RoleType_new" USING ("type"::text::"RoleType_new");
ALTER TYPE "RoleType" RENAME TO "RoleType_old";
ALTER TYPE "RoleType_new" RENAME TO "RoleType";
DROP TYPE "public"."RoleType_old";
ALTER TABLE "Role" ALTER COLUMN "type" SET DEFAULT 'VOLUNTEER';
COMMIT;
