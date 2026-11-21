-- A volunteer who picks "Others" in the interest picker types what that other
-- interest is. Kept only while OTHERS is among the selected codes.
ALTER TABLE "UserInterest" ADD COLUMN "other_interest" TEXT;
