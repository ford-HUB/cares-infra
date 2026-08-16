import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infastructures/prisma/prisma-service';

@Injectable()
export class AccountSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAccountByUserId(userId: string) {
    return this.prisma.account.findFirst({
      where: { user_id: userId },
      select: {
        account_id: true,
        email: true,
        password: true,
        user: {
          select: {
            role: {
              select: { type: true },
            },
          },
        },
      },
    });
  }

  findAccountByEmail(email: string) {
    return this.prisma.account.findUnique({
      where: { email },
      select: { account_id: true },
    });
  }

  updateEmail(accountId: string, email: string) {
    return this.prisma.account.update({
      where: { account_id: accountId },
      data: { email },
      select: { email: true },
    });
  }

  updatePassword(accountId: string, password: string) {
    return this.prisma.account.update({
      where: { account_id: accountId },
      data: { password },
      select: { account_id: true },
    });
  }
}
