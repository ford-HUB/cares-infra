-- CreateEnum
CREATE TYPE "AdminPosition" AS ENUM ('DIRECTOR', 'STAFF', 'COORDINATOR', 'ASSISTANT_COORDINATOR');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "admin_position" "AdminPosition";
