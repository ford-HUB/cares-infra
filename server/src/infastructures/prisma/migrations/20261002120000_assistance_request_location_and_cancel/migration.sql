-- Beneficiaries pin where assistance is needed, and can withdraw a request
-- that has not been completed yet.

-- AlterEnum
ALTER TYPE "AssistanceRequestStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "AssistanceRequest" ADD COLUMN     "location_latitude" DOUBLE PRECISION,
ADD COLUMN     "location_longitude" DOUBLE PRECISION,
ADD COLUMN     "location_details" TEXT,
ADD COLUMN     "cancelled_at" TIMESTAMP(3),
ADD COLUMN     "cancel_reason" TEXT;
