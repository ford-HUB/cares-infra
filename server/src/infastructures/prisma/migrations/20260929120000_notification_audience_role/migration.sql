-- Role-scoped mobile notifications: a row can name the side of the account
-- (VOLUNTEER / DONOR / BENEFICIARY) it belongs to. Null keeps the existing
-- meaning — the row is about the account and shows everywhere.

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN "audience_role" "RoleType";
