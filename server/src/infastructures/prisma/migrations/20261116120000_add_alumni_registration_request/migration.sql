-- An alumnus who signs up on the app presents an alumni ID instead of a student ID
-- and is not face verified, so the account waits for a director's approval.
ALTER TYPE "UserRequestKind" ADD VALUE 'ALUMNI_REGISTRATION';
