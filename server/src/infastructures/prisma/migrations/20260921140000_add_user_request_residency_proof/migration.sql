-- Beneficiary event applications carry a proof of residency the director
-- reviews before accepting; the file lives on S3, the row keeps the pointer.

-- AlterTable
ALTER TABLE "UserRequest"
  ADD COLUMN "residency_proof_url" TEXT,
  ADD COLUMN "residency_proof_name" TEXT,
  ADD COLUMN "residency_proof_mime" TEXT;
