import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '../../../../../infastructures/jwt/jwt-service';
import { isPortalRole } from 'src/shared/constants/portal-role-types';
import {
  ChangeEmailDto,
  ChangeEmailResponseDto,
  ChangePasswordDto,
  ChangePasswordResponseDto,
} from '../dto/account-settings-admin-dto';
import { AccountSettingsRepository } from '../../repositories/account-settings-repository';

@Injectable()
export class AccountSettingsAdminService {
  constructor(
    private readonly accountSettingsRepository: AccountSettingsRepository,
    private readonly jwtService: JwtService,
  ) {}

  async changeEmail(
    userId: string,
    data: ChangeEmailDto,
  ): Promise<ChangeEmailResponseDto> {
    const account =
      await this.accountSettingsRepository.findAccountByUserId(userId);
    if (!account || !isPortalRole(account.user.role.type)) {
      throw new UnauthorizedException('Account not found');
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

    return {
      email: updated.email,
      access_token: this.jwtService.sign({
        sub: userId,
        email: updated.email,
        role_type: account.user.role.type,
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

    const hashedPassword = await bcrypt.hash(data.new_password, 10);
    await this.accountSettingsRepository.updatePassword(
      account.account_id,
      hashedPassword,
    );

    return { message: 'Password updated successfully' };
  }

  private async verifyCurrentPassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<void> {
    let matches = false;
    try {
      matches = await bcrypt.compare(plainPassword, hashedPassword);
    } catch {
      throw new UnauthorizedException('Current password is incorrect');
    }

    if (!matches) {
      throw new UnauthorizedException('Current password is incorrect');
    }
  }
}
