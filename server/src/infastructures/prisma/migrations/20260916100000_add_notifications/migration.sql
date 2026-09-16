-- Portal notifications: one row per recipient, fanned out from a role-addressed notice
-- by the notification scheduler so read/dismissed state is per person.

-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('EVENT', 'REPORT', 'ACCESS', 'SYSTEM', 'VOLUNTEER', 'CERTIFICATE', 'DONATION', 'USER_REQUEST', 'SECURITY', 'SUPPORT', 'MAIL');

-- CreateEnum
CREATE TYPE "NotificationTone" AS ENUM ('INFO', 'ATTENTION', 'CRITICAL');

-- CreateTable
CREATE TABLE "Notification" (
    "notification_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "NotificationCategory" NOT NULL,
    "tone" "NotificationTone" NOT NULL DEFAULT 'INFO',
    "href" TEXT,
    "dedupe_key" TEXT,
    "read_at" TIMESTAMP(3),
    "dismissed_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("notification_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Notification_dedupe_key_user_id_key" ON "Notification"("dedupe_key", "user_id");

-- CreateIndex
CREATE INDEX "Notification_user_id_dismissed_at_createdAt_idx" ON "Notification"("user_id", "dismissed_at", "createdAt");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
