import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { JwtService } from '../../../../../infastructures/jwt/jwt-service';
import type { JwtPayload } from '../../../../../shared/types/jwt-payload';
import { isPortalRole } from 'src/shared/constants/portal-role-types';
import { isProtectedAdminEmail } from 'src/shared/constants/protected-admin';
import {
  ChangeEmailDto,
  ChangeEmailResponseDto,
  ChangePasswordDto,
  ChangePasswordResponseDto,
} from '../dto/account-settings-admin-dto';
import { AccountSettingsRepository } from '../../repositories/account-settings-repository';
import { ProfileCacheService } from '../../../../profile/services/profile-cache-service';
import { LoginPolicyEnforcer } from '../../../../security-policy/services/login-policy-enforcer';

@Injectable()
export class AccountSettingsAdminService {
  constructor(
    private readonly accountSettingsRepository: AccountSettingsRepository,
    private readonly jwtService: JwtService,
    private readonly profileCacheService: ProfileCacheService,
    private readonly configService: ConfigService,
    private readonly loginPolicyEnforcer: LoginPolicyEnforcer,
  ) {}

  async changeEmail(
    caller: JwtPayload,
    data: ChangeEmailDto,
  ): Promise<ChangeEmailResponseDto> {
    const userId = caller.sub;
    const account =
      await this.accountSettingsRepository.findAccountByUserId(userId);
    if (!account || !isPortalRole(account.user.role.type)) {
      throw new UnauthorizedException('Account not found');
    }

    // The root account's email is fixed so an admin is always reachable.
    if (isProtectedAdminEmail(account.email, this.configService)) {
      throw new ForbiddenException(
        'The sign-in email of the root administrator account cannot be changed',
      );
    }

    await this.verifyCurrentPassword(data.current_password, account.password);

    const newEmail = data.new_email.trim().toLowerCase();
    if (newEmail === account.email) {
      throw new ConflictException(
        'New email must be different from your current email',
      );
    }

    const existing =
      await this.accountSettingsRepository.findAccountByEmail(newEmail);
    if (existing) {
      throw new ConflictException('Email is already in use');
    }

    const updated = await this.accountSettingsRepository.updateEmail(
      account.account_id,
      newEmail,
    );

    // The cached profile row carries the email.
    await this.profileCacheService.invalidateProfile(userId);

    return {
      email: updated.email,
      access_token: this.jwtService.sign({
        sub: userId,
        email: updated.email,
        role_type: account.user.role.type,
        // Same session; only the token's address changed.
        sid: caller.sid,
      }),
    };
  }

  async changePassword(
    userId: string,
    data: ChangePasswordDto,
  ): Promise<ChangePasswordResponseDto> {
    const account =
      await this.accountSettingsRepository.findAccountByUserId(userId);
    if (!account || !isPortalRole(account.user.role.type)) {
      throw new UnauthorizedException('Account not found');
    }

    await this.verifyCurrentPassword(data.current_password, account.password);
    await this.loginPolicyEnforcer.assertPasswordMeetsPolicy(data.new_password);

    const hashedPassword = await bcrypt.hash(data.new_password, 10);
    await this.accountSettingsRepository.updatePassword(
      account.account_id,
      hashedPassword,
    );

    return { message: 'Password updated successfully' };
  }

  private async verifyCurrentPassword(
    plainPassword: string,
    // Null only for social-only accounts, which shouldn't reach here.
    hashedPassword: string | null,
  ): Promise<void> {
    // 400, not 401: the site treats every 401 as an ended session.
    if (!hashedPassword) {
      throw new BadRequestException('Current password is incorrect');
    }

    let matches = false;
    try {
      matches = await bcrypt.compare(plainPassword, hashedPassword);
    } catch {
      throw new BadRequestException('Current password is incorrect');
    }

    if (!matches) {
      throw new BadRequestException('Current password is incorrect');
    }
  }
}
