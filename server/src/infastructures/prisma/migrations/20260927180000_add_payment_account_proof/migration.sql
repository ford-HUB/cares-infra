-- Ownership proof for the account a channel pays into: CARES sends a small payout of a
-- random amount and the director reports what arrived. No API confirms who owns a GCash
-- number, so this is the check that the recorded account is really theirs.

-- CreateEnum
CREATE TYPE "PaymentAccountProof" AS ENUM ('NOT_STARTED', 'SENDING', 'AWAITING_CONFIRMATION', 'VERIFIED', 'FAILED');

-- AlterTable
ALTER TABLE "PaymentMethodSetting"
    ADD COLUMN "account_proof" "PaymentAccountProof" NOT NULL DEFAULT 'NOT_STARTED',
    ADD COLUMN "account_proof_amount" INTEGER,
    ADD COLUMN "account_proof_reference" TEXT,
    ADD COLUMN "account_proof_id" TEXT,
    ADD COLUMN "account_proof_sent_at" TIMESTAMP(3),
    ADD COLUMN "account_proof_attempts" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "account_proof_message" TEXT,
    ADD COLUMN "account_proof_target" TEXT,
    ADD COLUMN "account_verified_at" TIMESTAMP(3);
