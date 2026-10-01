-- A director can now reject a request with a reason the requester sees in the app.
-- A rejected event application does not block a fresh one for the same event.

-- AlterEnum
ALTER TYPE "UserRequestStatus" ADD VALUE 'REJECTED';

-- AlterTable
ALTER TABLE "UserRequest" ADD COLUMN "rejection_reason" TEXT;
