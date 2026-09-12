-- "Report a Problem" from the mobile app: flagging a user, event, campaign, or
-- content. Its own type so triage can filter these out of ordinary help requests.
ALTER TYPE "SupportTicketType" ADD VALUE 'REPORT';
