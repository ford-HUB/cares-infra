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

@Injectable()
export class AuthSiteService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
  ) {}

  async adminLogin(data: LoginDto): Promise<AdminLoginResponseDto> {
    const email = data.email.trim().toLowerCase();
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
    };
  }
}
