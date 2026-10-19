-- Lets an admin decide, from Access Control, who may mark volunteers present by hand
-- on the Attendees screen when the geofence could not rule on them. The baseline rows
-- are written in the next migration: Postgres refuses to use a new enum value inside
-- the transaction that added it.

-- AlterEnum
ALTER TYPE "PermissionKey" ADD VALUE 'ATTENDANCE_MANUAL_MARK';
