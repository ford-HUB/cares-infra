-- Sign-in state (restriction, last IP) and the portal signature belong to the
-- account, not the person. Copy each user's values onto their account(s) before
-- dropping the columns from User.
ALTER TABLE "Account" ADD COLUMN "signature_url" TEXT;
ALTER TABLE "Account" ADD COLUMN "is_restricted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Account" ADD COLUMN "restricted_at" TIMESTAMP(3);
ALTER TABLE "Account" ADD COLUMN "restriction_reason" TEXT;
ALTER TABLE "Account" ADD COLUMN "last_login_ip" TEXT;

UPDATE "Account" AS a
SET "signature_url"      = u."signature_url",
    "is_restricted"      = u."is_restricted",
    "restricted_at"      = u."restricted_at",
    "restriction_reason" = u."restriction_reason",
    "last_login_ip"      = u."last_login_ip"
FROM "User" AS u
WHERE u."user_id" = a."user_id";

ALTER TABLE "User" DROP COLUMN "signature_url";
ALTER TABLE "User" DROP COLUMN "is_restricted";
ALTER TABLE "User" DROP COLUMN "restricted_at";
ALTER TABLE "User" DROP COLUMN "restriction_reason";
ALTER TABLE "User" DROP COLUMN "last_login_ip";
