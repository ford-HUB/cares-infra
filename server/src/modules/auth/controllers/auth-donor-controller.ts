import {
  Controller,
  Headers,
  HttpCode,
  Ip,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ZBody, ZSerialize } from 'nest-zod';
import { DonorOAuthGuard } from 'src/infastructures/passport/guards/donor-oauth-guard';
import type { OAuthIdentityProfile } from 'src/infastructures/passport/oauth-identity';
import { AuthDonorService } from '../services/auth-donor-service';
import {
  DonorOAuthResponseSchema,
  DonorOAuthSchema,
  RegisterDonorSchema,
  RegisterDonorWithEmailSchema,
} from '../validators/auth-donor-validator';
import { LoginResponseSchema } from '../validators/auth-mobile-validator';
import type {
  DonorOAuthDto,
  DonorOAuthResponseDto,
  RegisterDonorDto,
  RegisterDonorWithEmailDto,
} from '../dto/auth-donor-dto';
import type { LoginResponseDto } from '../dto/auth-mobile-dto';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import { Public } from 'src/shared/decorators/public-decorator';

/**
 * Passport hangs the verified identity on `req.user`. It is a provider profile, not a
 * CARES identity — no session exists yet — so it deliberately shadows Express' `user`.
 */
type DonorOAuthRequest = Omit<Request, 'user'> & {
  user?: OAuthIdentityProfile;
};

@Controller('v1/auth/donor')
export class AuthDonorController {
  constructor(private readonly authDonorService: AuthDonorService) {}

  /**
   * Exchanges a Google ID token or Facebook access token for either a CARES session
   * (known donor) or a one-shot ticket the registration call below spends.
   *
   * `DonorOAuthGuard` has already run the strategy the posted `provider` names, so the
   * token itself never reaches the service — only the identity it proved.
   */
  @Post('oauth')
  @Public()
  @UseGuards(DonorOAuthGuard)
  @HttpCode(200)
  @ResponseMessage('Provider sign-in verified')
  @ZSerialize(DonorOAuthResponseSchema)
  async signInWithProvider(
    @ZBody(DonorOAuthSchema) data: DonorOAuthDto,
    @Req() request: DonorOAuthRequest,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent?: string,
  ): Promise<DonorOAuthResponseDto> {
    const profile = request.user;
    if (!profile) {
      throw new UnauthorizedException('Provider sign-in could not be verified');
    }

    return await this.authDonorService.signInWithProvider(
      data.provider,
      profile,
      ipAddress,
      userAgent,
    );
  }

  @Post('register')
  @Public()
  @ResponseMessage('Donor account created')
  @ZSerialize(LoginResponseSchema)
  async registerDonor(
    @ZBody(RegisterDonorSchema) data: RegisterDonorDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent?: string,
  ): Promise<LoginResponseDto> {
    return await this.authDonorService.registerDonor(
      data,
      ipAddress,
      userAgent,
    );
  }

  /**
   * Email + password donor sign-up. The address must have passed the shared OTP check
   * first — the client sends the code via `POST /v1/auth/send-verification` and
   * confirms it via `POST /v1/auth/verify-otp` before calling this.
   */
  @Post('register-email')
  @Public()
  @ResponseMessage('Donor account created')
  @ZSerialize(LoginResponseSchema)
  async registerDonorWithEmail(
    @ZBody(RegisterDonorWithEmailSchema) data: RegisterDonorWithEmailDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent?: string,
  ): Promise<LoginResponseDto> {
    return await this.authDonorService.registerDonorWithEmail(
      data,
      ipAddress,
      userAgent,
    );
  }
}
