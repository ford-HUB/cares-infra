-- Sign-up only enrols a face after it has matched the ID, but the verification it
-- opened was stored as pending and nothing ever moved it on — so those volunteers
-- showed as Pending in the portal. Registration now writes them as verified; this
-- brings the rows already on file in line.
UPDATE "UserVerification"
SET "status" = 'V', "updatedAt" = CURRENT_TIMESTAMP
WHERE "status" = 'N' AND "user_biometric_id" IS NOT NULL;
