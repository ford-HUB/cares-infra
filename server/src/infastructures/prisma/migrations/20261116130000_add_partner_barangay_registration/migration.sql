-- A volunteer who signs up through a partner barangay presents a valid ID (no
-- school ID number) and is not face verified, so the account waits for a
-- director's approval. The partner barangay they picked is kept on the user.
ALTER TYPE "UserRequestKind" ADD VALUE 'PARTNER_BARANGAY_REGISTRATION';

ALTER TABLE "User" ADD COLUMN "partner_barangay" TEXT;
