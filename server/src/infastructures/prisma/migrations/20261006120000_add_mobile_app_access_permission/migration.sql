-- Lets an admin decide, from Access Control, whether directors and coordinators may
-- sign in to the mobile app with their portal credentials. The baseline rows are
-- written in the next migration: Postgres refuses to use a new enum value inside the
-- transaction that added it.

-- AlterEnum
ALTER TYPE "PermissionKey" ADD VALUE 'MOBILE_APP_ACCESS';
