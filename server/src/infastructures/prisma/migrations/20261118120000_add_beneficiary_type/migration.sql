-- A beneficiary signs up as REGULAR (no ID; a director approves) or as STUDENT
-- (UC school ID + face match + OTP, no approval). A student beneficiary's school
-- record is real, so they see their department's School events and their
-- Volunteer side opens without a role-access request.
CREATE TYPE "BeneficiaryType" AS ENUM ('REGULAR', 'STUDENT');

ALTER TABLE "User" ADD COLUMN "beneficiary_type" "BeneficiaryType";

-- Every beneficiary before this signed up without an ID.
UPDATE "User" AS u
SET "beneficiary_type" = 'REGULAR'
FROM "Role" AS r
WHERE u."role_id" = r."role_id" AND r."type" = 'BENEFICIARY';
