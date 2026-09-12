-- Beneficiaries tell us how many people live with them so the relief desk can
-- size assistance. Lives on User (there is no beneficiary table); volunteers
-- and donors leave it null.
ALTER TABLE "User" ADD COLUMN "household_size" INTEGER;
