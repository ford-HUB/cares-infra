-- The director-entered Xendit account CARES collects donations into, plus one row per
-- donor-facing channel so a method the director has not enabled is neither offered in
-- the app nor accepted by the checkout endpoint. Secrets are stored as ciphertext.

-- AlterEnum
ALTER TYPE "PermissionKey" ADD VALUE 'PAYMENT_SETTINGS_MANAGE';

-- CreateEnum
CREATE TYPE "PaymentGatewayMode" AS ENUM ('TEST', 'LIVE');

-- CreateTable
CREATE TABLE "PaymentGatewaySettings" (
    "payment_gateway_settings_id" TEXT NOT NULL,
    "singleton" BOOLEAN NOT NULL DEFAULT true,
    "mode" "PaymentGatewayMode" NOT NULL DEFAULT 'TEST',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "secret_key_cipher" TEXT,
    "secret_key_last4" TEXT,
    "webhook_token_cipher" TEXT,
    "api_url" TEXT,
    "statement_name" TEXT,
    "support_email" TEXT,
    "support_contact" TEXT,
    "verified_at" TIMESTAMP(3),
    "verification_error" TEXT,
    "updated_by_user_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentGatewaySettings_pkey" PRIMARY KEY ("payment_gateway_settings_id")
);

-- CreateTable
CREATE TABLE "PaymentMethodSetting" (
    "payment_method_setting_id" TEXT NOT NULL,
    "settings_id" TEXT NOT NULL,
    "method" "DonationPaymentMethod" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "display_name" TEXT,
    "instructions" TEXT,
    "account_name" TEXT,
    "account_number" TEXT,
    "channel_codes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "min_amount" INTEGER NOT NULL DEFAULT 0,
    "max_amount" INTEGER NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentMethodSetting_pkey" PRIMARY KEY ("payment_method_setting_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentGatewaySettings_singleton_key" ON "PaymentGatewaySettings"("singleton");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethodSetting_settings_id_method_key" ON "PaymentMethodSetting"("settings_id", "method");

-- AddForeignKey
ALTER TABLE "PaymentMethodSetting" ADD CONSTRAINT "PaymentMethodSetting_settings_id_fkey" FOREIGN KEY ("settings_id") REFERENCES "PaymentGatewaySettings"("payment_gateway_settings_id") ON DELETE CASCADE ON UPDATE CASCADE;
