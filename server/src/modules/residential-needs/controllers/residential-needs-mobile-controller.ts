import { Controller, Get, Put } from '@nestjs/common';
import { ZBody, ZSerialize } from 'nest-zod';
import { CurrentUser } from 'src/shared/decorators/current-user-decorator';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import { Roles } from 'src/shared/decorators/roles-decorator';
import type { JwtPayload } from 'src/shared/types/jwt-payload';
import type {
  MyNeedsAssessmentResponseDto,
  SubmitNeedsAssessmentDto,
} from '../dto/residential-needs-mobile-dto';
import { ResidentialNeedsMobileService } from '../services/residential-needs-mobile-service';
import {
  MOBILE_NEEDS_ROLE_TYPES,
  MyNeedsAssessmentResponseSchema,
  SubmitNeedsAssessmentSchema,
} from '../validators/residential-needs-mobile-validator';

/**
 * The beneficiary's Needs Assessment Survey. Shares `v1/residential-needs`
 * with the portal controller; every route here sits under `me` so the two
 * never collide.
 */
@Controller('v1/residential-needs')
@Roles(...MOBILE_NEEDS_ROLE_TYPES)
export class ResidentialNeedsMobileController {
  constructor(
    private readonly residentialNeedsMobileService: ResidentialNeedsMobileService,
  ) {}

  @Get('me')
  @ResponseMessage('Your needs assessment')
  @ZSerialize(MyNeedsAssessmentResponseSchema)
  async findMine(
    @CurrentUser() user: JwtPayload,
  ): Promise<MyNeedsAssessmentResponseDto> {
    return this.residentialNeedsMobileService.findMine(user.sub);
  }

  /** Takes the survey the first time and overwrites it on every update. */
  @Put('me')
  @ResponseMessage('Needs assessment saved')
  @ZSerialize(MyNeedsAssessmentResponseSchema)
  async submit(
    @ZBody(SubmitNeedsAssessmentSchema) body: SubmitNeedsAssessmentDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<MyNeedsAssessmentResponseDto> {
    return this.residentialNeedsMobileService.submit(user.sub, body);
  }
}
