-- The face embedding captured during the role-access check, so accepting the
-- request can enrol the biometric without re-running the face service.

-- AlterTable
ALTER TABLE "UserRequest" ADD COLUMN "selfie_embedding" JSONB;
