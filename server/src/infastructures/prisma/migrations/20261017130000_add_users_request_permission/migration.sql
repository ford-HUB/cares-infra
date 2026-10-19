-- Gives Users → Request its own checkbox in Access Control instead of riding on
-- USERS_VIEW. The baseline rows are written in the next migration: Postgres refuses
-- to use a new enum value inside the transaction that added it.

-- AlterEnum
ALTER TYPE "PermissionKey" ADD VALUE 'USERS_REQUEST' AFTER 'USERS_EXPORT';
