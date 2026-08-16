import { AuthRepository } from '../repositories/auth-repository';
import {
  AdminLoginResponseDto,
  LoginDto,
  MeResponseDto,
} from '../dto/auth-site-dto';
import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from 'src/infastructures/jwt/jwt-service';
import { JwtPayload } from 'src/shared/types/jwt-payload';
import { isPortalRole } from 'src/shared/constants/portal-role-types';
import { isProtectedAdminEmail } from 'src/shared/constants/protected-admin';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthSiteService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async adminLogin(
    data: LoginDto,
    ipAddress?: string,
  ): Promise<AdminLoginResponseDto> {
    const email = data.email.trim().toLowerCase();

    if (ipAddress && (await this.authRepository.findBlockedIp(ipAddress))) {
      throw new ForbiddenException(
        'Sign-in from this network has been blocked',
      );
    }

    const account = await this.authRepository.findAccountForLogin(email);
    if (!account) {
      throw new UnauthorizedException('Invalid email or password');
    }

    let passwordMatches = false;
    try {
      passwordMatches = await bcrypt.compare(data.password, account.password);
    } catch {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!isPortalRole(account.user.role.type)) {
      throw new ForbiddenException('This portal is for administrators only');
    }

    if (account.user.is_restricted) {
      throw new ForbiddenException(
        account.user.restriction_reason
          ? `Account restricted: ${account.user.restriction_reason}`
          : 'This account has been restricted by an administrator',
      );
    }

    if (ipAddress) {
      await this.authRepository.recordLoginIp(account.user.user_id, ipAddress);
    }

    return {
      user_id: account.user.user_id,
      role_type: account.user.role.type,
      email: account.email,
      firstname: account.user.firstname,
      lastname: account.user.lastname,
      has_interests: account.user.user_interest !== null,
      access_token: this.jwtService.sign({
        sub: account.user.user_id,
        email: account.email,
        role_type: account.user.role.type,
      }),
    };
  }

  async getMe(user: JwtPayload): Promise<MeResponseDto> {
    const profile = await this.authRepository.findUserProfile(user.sub);
    if (!profile) {
      throw new UnauthorizedException('User not found');
    }

    const email = profile.accounts[0]?.email ?? user.email;

    return {
      user_id: profile.user_id,
      email,
      firstname: profile.firstname,
      lastname: profile.lastname,
      role_type: profile.role.type,
      is_protected: isProtectedAdminEmail(email, this.configService),
    };
  }
}
