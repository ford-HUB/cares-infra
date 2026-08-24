import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infastructures/prisma/prisma-service';
import type {
  SecurityPolicyValuesDto,
  UpdateSecurityPolicyDto,
} from '../dto/security-policy-site-dto';

@Injectable()
export class SecurityPolicyRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Null before an administrator has saved the policy for the first time. */
  async findPolicy() {
    return this.prisma.securityPolicy.findUnique({
      where: { singleton: true },
    });
  }

  /**
   * Upserts the one row. `singleton` is unique, so a concurrent save updates the same
   * record instead of creating a second policy.
   */
  async savePolicy(data: UpdateSecurityPolicyDto, updatedByUserId: string) {
    const values: SecurityPolicyValuesDto = data;

    return this.prisma.securityPolicy.upsert({
      where: { singleton: true },
      create: {
        ...values,
        singleton: true,
        updated_by_user_id: updatedByUserId,
      },
      update: { ...values, updated_by_user_id: updatedByUserId },
    });
  }
}
