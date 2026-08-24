-- AlterEnum
ALTER TYPE "LoginOutcome" ADD VALUE 'CREDENTIAL_EXPIRED';

-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "credential_expires_at" TIMESTAMP(3),
ADD COLUMN     "provisioned_by_user_id" TEXT;
