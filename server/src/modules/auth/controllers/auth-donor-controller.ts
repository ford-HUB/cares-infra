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

/** A provider profile, not a CARES identity; shadows Express' `user`. */
type DonorOAuthRequest = Omit<Request, 'user'> & {
  user?: OAuthIdentityProfile;
};

@Controller('v1/auth/donor')
export class AuthDonorController {
  constructor(private readonly authDonorService: AuthDonorService) {}

  /** Returns a session (known donor) or a one-shot ticket for `register`. The guard already verified the token. */
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

  /** Requires the OTP via `send-verification` + `verify-otp` first. */
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
