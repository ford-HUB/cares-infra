-- Mobile password sign-in now requires the email to have been proven with the OTP.
-- Accounts that already exist were never stamped, so only the ones whose address is
-- vouched for some other way are backfilled: administrator-provisioned accounts (the
-- credential was mailed to the address) and provider-only accounts (no password to
-- sign in with). Every other password account verifies once on its next mobile sign-in.

-- AlterEnum
ALTER TYPE "LoginOutcome" ADD VALUE 'EMAIL_NOT_VERIFIED';

-- AlterTable
ALTER TABLE "Account" ADD COLUMN "email_verified_at" TIMESTAMP(3);

-- Backfill
UPDATE "Account"
SET "email_verified_at" = "createdAt"
WHERE "provisioned_by_user_id" IS NOT NULL OR "password" IS NULL;
