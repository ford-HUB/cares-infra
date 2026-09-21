-- Money donations paid through Xendit: one row per checkout the app starts, plus
-- a ledger of applied gateway callbacks so a retried webhook is a no-op.

-- CreateEnum
CREATE TYPE "DonationPaymentMethod" AS ENUM ('GCASH', 'QRPH', 'CARD', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "DonationPaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'EXPIRED');

-- CreateTable
CREATE TABLE "DonationPayment" (
    "donation_payment_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "event_id" INTEGER,
    "campaign_id" TEXT NOT NULL,
    "campaign_title" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PHP',
    "method" "DonationPaymentMethod" NOT NULL,
    "status" "DonationPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "idempotency_key" TEXT NOT NULL,
    "gateway_reference" TEXT NOT NULL,
    "gateway_resource_id" TEXT,
    "payment_reference" TEXT,
    "payment_channel" TEXT,
    "checkout_url" TEXT,
    "qr_string" TEXT,
    "expires_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DonationPayment_pkey" PRIMARY KEY ("donation_payment_id")
);

-- CreateTable
CREATE TABLE "PaymentWebhookEvent" (
    "webhook_id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "gateway_reference" TEXT,
    "payload" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("webhook_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DonationPayment_gateway_reference_key" ON "DonationPayment"("gateway_reference");

-- CreateIndex
CREATE INDEX "DonationPayment_user_id_idx" ON "DonationPayment"("user_id");

-- CreateIndex
CREATE INDEX "DonationPayment_status_idx" ON "DonationPayment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "DonationPayment_user_id_idempotency_key_key" ON "DonationPayment"("user_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_gateway_reference_idx" ON "PaymentWebhookEvent"("gateway_reference");

-- AddForeignKey
ALTER TABLE "DonationPayment" ADD CONSTRAINT "DonationPayment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonationPayment" ADD CONSTRAINT "DonationPayment_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "Event"("event_id") ON DELETE SET NULL ON UPDATE CASCADE;
