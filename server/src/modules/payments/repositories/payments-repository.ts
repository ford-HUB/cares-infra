import { Injectable } from '@nestjs/common';
import type {
  DonationPaymentMethod,
  PaymentAccountProof,
  PaymentGatewayMode,
  PaymentMethodVerification,
  Prisma,
} from '../../../infastructures/prisma/common/client';
import { PrismaService } from '../../../infastructures/prisma/prisma-service';

/** The singleton row plus its channel rows — the shape every read here returns. */
export type PaymentSettingsRow = Prisma.PaymentGatewaySettingsGetPayload<{
  include: { methods: true };
}>;

/** What a save writes on the settings row; the secrets are already ciphertext. */
export interface PaymentSettingsWrite {
  mode: PaymentGatewayMode;
  enabled: boolean;
  api_url: string | null;
  statement_name: string | null;
  support_email: string | null;
  support_contact: string | null;
  /** Undefined leaves the stored secret alone; null clears it. */
  secret_key_cipher?: string | null;
  secret_key_last4?: string | null;
  webhook_token_cipher?: string | null;
}

export interface PaymentMethodWrite {
  method: DonationPaymentMethod;
  enabled: boolean;
  display_name: string | null;
  instructions: string | null;
  account_name: string | null;
  account_number: string | null;
  channel_codes: string[];
  min_amount: number;
  max_amount: number;
  sort_order: number;
  /**
   * Only set when a save switches the channel off: its activation verdict is cleared
   * so a channel that comes back on is checked again rather than trusting an old pass.
   */
  verification?: PaymentMethodVerification;
  verified_at?: Date | null;
  verification_message?: string | null;
  verified_channel_codes?: string[];
  callbacks_registered_at?: Date | null;
}

/** One step of the ownership proof, as written onto the channel's row. */
export interface PaymentAccountProofWrite {
  account_proof: PaymentAccountProof;
  account_proof_amount?: number | null;
  account_proof_reference?: string | null;
  account_proof_id?: string | null;
  account_proof_sent_at?: Date | null;
  account_proof_attempts?: number;
  account_proof_message?: string | null;
  account_proof_target?: string | null;
  account_verified_at?: Date | null;
}

/** The verdict of one activation check, as written onto the channel's row. */
export interface PaymentMethodVerificationWrite {
  verification: PaymentMethodVerification;
  verified_at: Date | null;
  verification_message: string | null;
  verified_channel_codes: string[];
  callbacks_registered_at?: Date | null;
}

@Injectable()
export class PaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Null until the director saves the module for the first time. */
  async findSettings(): Promise<PaymentSettingsRow | null> {
    return this.prisma.paymentGatewaySettings.findUnique({
      where: { singleton: true },
      include: { methods: true },
    });
  }

  /**
   * Upserts the one row and replaces its channel rows, in a single transaction: a
   * half-applied save would leave a channel enabled against credentials that were
   * never stored.
   */
  async saveSettings(
    settings: PaymentSettingsWrite,
    methods: PaymentMethodWrite[],
    updatedByUserId: string,
  ): Promise<PaymentSettingsRow> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.paymentGatewaySettings.upsert({
        where: { singleton: true },
        create: {
          ...settings,
          singleton: true,
          updated_by_user_id: updatedByUserId,
        },
        update: { ...settings, updated_by_user_id: updatedByUserId },
      });

      for (const method of methods) {
        await tx.paymentMethodSetting.upsert({
          where: {
            settings_id_method: {
              settings_id: row.payment_gateway_settings_id,
              method: method.method,
            },
          },
          create: {
            ...method,
            settings_id: row.payment_gateway_settings_id,
          },
          update: method,
        });
      }

      return tx.paymentGatewaySettings.findUniqueOrThrow({
        where: { payment_gateway_settings_id: row.payment_gateway_settings_id },
        include: { methods: true },
      });
    });
  }

  /**
   * The settings row and a row per channel, created on first use. The activation check
   * can run before the director has ever pressed Save, so it cannot assume either
   * exists.
   */
  async ensureSettings(
    methods: PaymentMethodWrite[],
    updatedByUserId: string,
  ): Promise<PaymentSettingsRow> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.paymentGatewaySettings.upsert({
        where: { singleton: true },
        create: { singleton: true, updated_by_user_id: updatedByUserId },
        update: {},
      });

      for (const method of methods) {
        await tx.paymentMethodSetting.upsert({
          where: {
            settings_id_method: {
              settings_id: row.payment_gateway_settings_id,
              method: method.method,
            },
          },
          create: { ...method, settings_id: row.payment_gateway_settings_id },
          // Only fills the gap — an existing channel keeps everything it was saved with.
          update: {},
        });
      }

      return tx.paymentGatewaySettings.findUniqueOrThrow({
        where: { payment_gateway_settings_id: row.payment_gateway_settings_id },
        include: { methods: true },
      });
    });
  }

  /** Writes one step of the ownership proof onto a channel. */
  async recordAccountProof(
    settingsId: string,
    method: DonationPaymentMethod,
    proof: PaymentAccountProofWrite,
  ): Promise<PaymentSettingsRow> {
    await this.prisma.paymentMethodSetting.update({
      where: { settings_id_method: { settings_id: settingsId, method } },
      data: proof,
    });

    return this.prisma.paymentGatewaySettings.findUniqueOrThrow({
      where: { payment_gateway_settings_id: settingsId },
      include: { methods: true },
    });
  }

  /** Writes the verdict of an activation check onto one channel. */
  async recordMethodVerification(
    settingsId: string,
    method: DonationPaymentMethod,
    verdict: PaymentMethodVerificationWrite,
  ): Promise<PaymentSettingsRow> {
    await this.prisma.paymentMethodSetting.update({
      where: { settings_id_method: { settings_id: settingsId, method } },
      data: verdict,
    });

    return this.prisma.paymentGatewaySettings.findUniqueOrThrow({
      where: { payment_gateway_settings_id: settingsId },
      include: { methods: true },
    });
  }

  /**
   * Records the outcome of a connection test. `verification_error` is cleared on a
   * pass, so the portal never shows a stale reason next to a working key.
   */
  async recordVerification(
    settingsId: string,
    error: string | null,
  ): Promise<PaymentSettingsRow> {
    return this.prisma.paymentGatewaySettings.update({
      where: { payment_gateway_settings_id: settingsId },
      data: {
        verified_at: error ? null : new Date(),
        verification_error: error,
      },
      include: { methods: true },
    });
  }
}
