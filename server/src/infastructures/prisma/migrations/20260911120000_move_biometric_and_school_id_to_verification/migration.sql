-- Verification status codes: N = pending, F = failed, V = verified.
-- Postgres cannot rename or remove enum values in place, so the column is swapped
-- onto a fresh type with the old values mapped across.
CREATE TYPE "VerificationStatus_new" AS ENUM ('N', 'F', 'V');
ALTER TABLE "UserVerification" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "UserVerification"
  ALTER COLUMN "status" TYPE "VerificationStatus_new"
  USING (
    CASE "status"::text
      WHEN 'APPROVED' THEN 'V'
      WHEN 'REJECTED' THEN 'F'
      ELSE 'N'
    END
  )::"VerificationStatus_new";
ALTER TYPE "VerificationStatus" RENAME TO "VerificationStatus_old";
ALTER TYPE "VerificationStatus_new" RENAME TO "VerificationStatus";
DROP TYPE "VerificationStatus_old";
ALTER TABLE "UserVerification" ALTER COLUMN "status" SET DEFAULT 'N';

-- The school ID scan belongs with the rest of the school record.
ALTER TABLE "UserSchoolInfo" ADD COLUMN "school_id_url" TEXT;
UPDATE "UserSchoolInfo" AS s
SET "school_id_url" = v."school_id_url"
FROM (
  SELECT DISTINCT ON ("user_id") "user_id", "school_id_url"
  FROM "UserVerification"
  ORDER BY "user_id", "createdAt" DESC
) AS v
WHERE v."user_id" = s."user_id";
ALTER TABLE "UserVerification" DROP COLUMN "school_id_url";

-- A biometric now hangs off the verification it was captured for instead of the user.
ALTER TABLE "UserVerification" ADD COLUMN "user_biometric_id" TEXT;

-- Every existing biometric needs a verification row to hang off. Attach it to the
-- user's latest verification that has no biometric yet, and create one for users
-- who were never given a verification row.
WITH latest_biometric AS (
  SELECT DISTINCT ON ("user_id") "user_id", "user_biometric_id"
  FROM "UserBiometric"
  ORDER BY "user_id", "isActive" DESC, "createdAt" DESC
),
latest_verification AS (
  SELECT DISTINCT ON ("user_id") "user_id", "user_verification_id"
  FROM "UserVerification"
  ORDER BY "user_id", "createdAt" DESC
)
UPDATE "UserVerification" AS v
SET "user_biometric_id" = b."user_biometric_id"
FROM latest_verification lv
JOIN latest_biometric b ON b."user_id" = lv."user_id"
WHERE v."user_verification_id" = lv."user_verification_id";

INSERT INTO "UserVerification" ("user_verification_id", "user_id", "user_biometric_id", "status", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, b."user_id", b."user_biometric_id", 'N', b."createdAt", b."updatedAt"
FROM "UserBiometric" b
WHERE NOT EXISTS (
  SELECT 1 FROM "UserVerification" v WHERE v."user_biometric_id" = b."user_biometric_id"
);

CREATE UNIQUE INDEX "UserVerification_user_biometric_id_key" ON "UserVerification"("user_biometric_id");
ALTER TABLE "UserVerification"
  ADD CONSTRAINT "UserVerification_user_biometric_id_fkey"
  FOREIGN KEY ("user_biometric_id") REFERENCES "UserBiometric"("user_biometric_id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "UserBiometric" DROP CONSTRAINT "UserBiometric_user_id_fkey";
ALTER TABLE "UserBiometric" DROP COLUMN "user_id";
