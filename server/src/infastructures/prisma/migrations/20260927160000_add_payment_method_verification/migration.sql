-- Switching a payment method on now asks Xendit whether that channel is activated on
-- the account and registers its callbacks; the outcome is kept per channel so the
-- portal can show "waiting for the account", "active" or the gateway's refusal.

-- CreateEnum
CREATE TYPE "PaymentMethodVerification" AS ENUM ('NOT_VERIFIED', 'PENDING', 'VERIFIED', 'FAILED');

-- AlterTable
ALTER TABLE "PaymentMethodSetting"
    ADD COLUMN "verification" "PaymentMethodVerification" NOT NULL DEFAULT 'NOT_VERIFIED',
    ADD COLUMN "verified_at" TIMESTAMP(3),
    ADD COLUMN "verification_message" TEXT,
    ADD COLUMN "verified_channel_codes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN "callbacks_registered_at" TIMESTAMP(3);
