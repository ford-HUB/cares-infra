-- Rename the audience in place so existing rows (an enum array column) keep their value.
ALTER TYPE "AnnouncementAudience" RENAME VALUE 'STAFF' TO 'COORDINATORS';
