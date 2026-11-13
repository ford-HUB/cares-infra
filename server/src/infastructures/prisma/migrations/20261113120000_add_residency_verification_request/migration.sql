-- A proof of residency uploaded from the mobile profile goes to the director's
-- request queue; the beneficiary profile stays incomplete until it is accepted.
ALTER TYPE "UserRequestKind" ADD VALUE 'RESIDENCY_VERIFICATION';
