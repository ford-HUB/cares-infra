-- New beneficiary accounts wait for a director's approval, filed as a user
-- request that carries the supporting document from the sign-up form.

-- AlterEnum
ALTER TYPE "UserRequestKind" ADD VALUE 'BENEFICIARY_REGISTRATION';

-- AlterTable
ALTER TABLE "UserRequest" ADD COLUMN     "document_url" TEXT,
ADD COLUMN     "document_name" TEXT,
ADD COLUMN     "document_mime" TEXT,
ADD COLUMN     "document_size_bytes" INTEGER;
