-- A staff or alumni volunteer whose ID photo the app could not recognize may
-- register manually: the ID skips the automatic checks and the face scan, and
-- the account waits for a director to approve the request.
ALTER TYPE "UserRequestKind" ADD VALUE 'MANUAL_REGISTRATION';
