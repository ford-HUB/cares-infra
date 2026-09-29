-- AlterEnum: interests now mirror the portal's event categories.
-- Postgres refuses to use a new enum value in the transaction that added it, so the
-- catalog rows are seeded in the following migration.
ALTER TYPE "InterestCode" ADD VALUE 'SCHOOL';
ALTER TYPE "InterestCode" ADD VALUE 'COMMUNITY';
ALTER TYPE "InterestCode" ADD VALUE 'EMERGENCY';
ALTER TYPE "InterestCode" ADD VALUE 'DONATION_DRIVE';
ALTER TYPE "InterestCode" ADD VALUE 'CHARITY';
ALTER TYPE "InterestCode" ADD VALUE 'RELIEF_PROGRAM';
ALTER TYPE "InterestCode" ADD VALUE 'HEALTH';
ALTER TYPE "InterestCode" ADD VALUE 'OUTREACH';
ALTER TYPE "InterestCode" ADD VALUE 'TRAINING';
ALTER TYPE "InterestCode" ADD VALUE 'SEMINAR';
ALTER TYPE "InterestCode" ADD VALUE 'OTHERS';
