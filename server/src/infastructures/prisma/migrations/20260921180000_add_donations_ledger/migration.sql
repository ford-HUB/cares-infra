-- The donation ledger: money rows opened by the paid gateway callback, goods rows
-- opened by the donor's pledge, both walked to CONFIRMED by the portal's Donation
-- Tracking. Plus the donor-board rate and goods values on RankingSettings.

-- AlterTable
ALTER TABLE "RankingSettings" ADD COLUMN     "donor_pesos_per_point" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "goods_type_values" JSONB;

-- CreateEnum
CREATE TYPE "DonationKind" AS ENUM ('MONEY', 'GOODS');

-- CreateEnum
CREATE TYPE "DonationStatus" AS ENUM ('PLEDGED', 'AWAITING_PICKUP', 'VERIFYING', 'CONFIRMED', 'DECLINED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Donation" (
    "donation_id" TEXT NOT NULL,
    "sequence" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "event_id" INTEGER NOT NULL,
    "kind" "DonationKind" NOT NULL,
    "status" "DonationStatus" NOT NULL DEFAULT 'PLEDGED',
    "amount" INTEGER NOT NULL,
    "payment_id" TEXT,
    "goods_type" TEXT,
    "goods_item" TEXT,
    "goods_quantity" INTEGER,
    "pickup_address" TEXT,
    "pickup_contact" TEXT,
    "pickup_date" TIMESTAMP(3),
    "pickup_time_minutes" INTEGER,
    "confirmed_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Donation_pkey" PRIMARY KEY ("donation_id")
);

-- CreateTable
CREATE TABLE "DonationTrailEntry" (
    "donation_trail_entry_id" TEXT NOT NULL,
    "donation_id" TEXT NOT NULL,
    "status" "DonationStatus" NOT NULL,
    "note" TEXT,
    "actor_id" TEXT,
    "actor_label" TEXT NOT NULL,
    "notified_email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DonationTrailEntry_pkey" PRIMARY KEY ("donation_trail_entry_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Donation_sequence_key" ON "Donation"("sequence");

-- CreateIndex
CREATE UNIQUE INDEX "Donation_payment_id_key" ON "Donation"("payment_id");

-- CreateIndex
CREATE INDEX "Donation_user_id_idx" ON "Donation"("user_id");

-- CreateIndex
CREATE INDEX "Donation_event_id_idx" ON "Donation"("event_id");

-- CreateIndex
CREATE INDEX "Donation_status_idx" ON "Donation"("status");

-- CreateIndex
CREATE INDEX "DonationTrailEntry_donation_id_idx" ON "DonationTrailEntry"("donation_id");

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "Event"("event_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "DonationPayment"("donation_payment_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonationTrailEntry" ADD CONSTRAINT "DonationTrailEntry_donation_id_fkey" FOREIGN KEY ("donation_id") REFERENCES "Donation"("donation_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonationTrailEntry" ADD CONSTRAINT "DonationTrailEntry_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
