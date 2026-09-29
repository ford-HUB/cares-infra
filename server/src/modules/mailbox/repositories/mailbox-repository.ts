import { Injectable } from '@nestjs/common';
import { GmailConnection } from '../../../infastructures/prisma/common/client';
import { PrismaService } from '../../../infastructures/prisma/prisma-service';

export interface GmailConnectionInput {
  google_sub: string;
  email: string;
  scope: string;
  access_token: string;
  refresh_token: string;
  access_expires_at: Date;
}

@Injectable()
export class MailboxRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findConnectionByUserId(
    userId: string,
  ): Promise<GmailConnection | null> {
    return this.prisma.gmailConnection.findUnique({
      where: { user_id: userId },
    });
  }

  /** Re-consenting replaces the stored grant rather than stacking a second row. */
  async upsertConnection(
    userId: string,
    data: GmailConnectionInput,
  ): Promise<GmailConnection> {
    return this.prisma.gmailConnection.upsert({
      where: { user_id: userId },
      create: { user_id: userId, ...data },
      update: data,
    });
  }

  async updateAccessToken(
    userId: string,
    accessToken: string,
    accessExpiresAt: Date,
  ): Promise<GmailConnection> {
    return this.prisma.gmailConnection.update({
      where: { user_id: userId },
      data: { access_token: accessToken, access_expires_at: accessExpiresAt },
    });
  }

  async deleteConnection(userId: string): Promise<void> {
    await this.prisma.gmailConnection.deleteMany({
      where: { user_id: userId },
    });
  }
}
