-- CreateEnum
CREATE TYPE "AnnouncementTone" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AnnouncementAudience" AS ENUM ('VOLUNTEERS', 'BENEFICIARIES', 'DONORS', 'STAFF');

-- CreateEnum
CREATE TYPE "AnnouncementChannel" AS ENUM ('PORTAL', 'MOBILE', 'EMAIL');

-- CreateEnum
CREATE TYPE "AnnouncementState" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'EXPIRED');

-- CreateTable
CREATE TABLE "Announcement" (
    "announcement_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "tone" "AnnouncementTone" NOT NULL DEFAULT 'INFO',
    "audiences" "AnnouncementAudience"[] DEFAULT ARRAY[]::"AnnouncementAudience"[],
    "channels" "AnnouncementChannel"[] DEFAULT ARRAY[]::"AnnouncementChannel"[],
    "state" "AnnouncementState" NOT NULL DEFAULT 'DRAFT',
    "publish_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3),
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "window_id" TEXT,
    "author_id" TEXT,
    "author_name" TEXT NOT NULL,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("announcement_id")
);

-- CreateIndex
CREATE INDEX "Announcement_state_idx" ON "Announcement"("state");

-- CreateIndex
CREATE INDEX "Announcement_publish_at_idx" ON "Announcement"("publish_at");

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
