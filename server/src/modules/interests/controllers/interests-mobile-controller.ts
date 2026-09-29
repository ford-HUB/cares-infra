import { Controller, ForbiddenException, Get, Put } from '@nestjs/common';
import { ZBody, ZParam, ZSerialize } from 'nest-zod';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import { Public } from 'src/shared/decorators/public-decorator';
import { Roles } from 'src/shared/decorators/roles-decorator';
import { CurrentUser } from 'src/shared/decorators/current-user-decorator';
import {
  RequestContext,
  type RequestContextDto,
} from 'src/shared/decorators/request-context-decorator';
import {
  isPortalRole,
  PORTAL_ROLE_TYPES,
} from 'src/shared/constants/portal-role-types';
import { MOBILE_PROFILE_ROLE_TYPES } from 'src/modules/profile/validators/profile-mobile-validator';
import type { JwtPayload } from 'src/shared/types/jwt-payload';
import type {
  InterestCatalogItemDto,
  SaveUserInterestsDto,
  SaveUserInterestsResponseDto,
  UserInterestsResponseDto,
} from '../dto/interests-mobile-dto';
import { InterestsMobileService } from '../services/interests-mobile-service';
import {
  InterestCatalogResponseSchema,
  SaveUserInterestsResponseSchema,
  SaveUserInterestsSchema,
  UserIdParamSchema,
  UserInterestsResponseSchema,
} from '../validators/interests-mobile-validator';

@Controller('v1/interests')
export class InterestsMobileController {
  constructor(
    private readonly interestsMobileService: InterestsMobileService,
  ) {}

  @Get()
  @Public()
  @ResponseMessage('Interest catalog')
  @ZSerialize(InterestCatalogResponseSchema)
  async listInterests(): Promise<InterestCatalogItemDto[]> {
    return this.interestsMobileService.listInterests();
  }

  /**
   * Open to every mobile role: the role switcher is local to the app, so a
   * beneficiary- or donor-registered account on its volunteer dashboard still
   * carries the registered role in its token.
   */
  @Put()
  @Roles(...MOBILE_PROFILE_ROLE_TYPES)
  @ResponseMessage('Interests saved')
  @ZSerialize(SaveUserInterestsResponseSchema)
  async saveUserInterests(
    @CurrentUser() user: JwtPayload,
    @ZBody(SaveUserInterestsSchema) data: SaveUserInterestsDto,
    @RequestContext() context: RequestContextDto,
  ): Promise<SaveUserInterestsResponseDto> {
    return this.interestsMobileService.saveUserInterests(
      user.sub,
      data.selected,
      { actor: user, context },
    );
  }

  @Get(':userId')
  @Roles(...MOBILE_PROFILE_ROLE_TYPES, ...PORTAL_ROLE_TYPES)
  @ResponseMessage('User interests')
  @ZSerialize(UserInterestsResponseSchema)
  async getUserInterests(
    @CurrentUser() user: JwtPayload,
    @ZParam('userId', UserIdParamSchema) userId: string,
  ): Promise<UserInterestsResponseDto> {
    if (!isPortalRole(user.role_type) && user.sub !== userId) {
      throw new ForbiddenException('You can only view your own interests');
    }

    return this.interestsMobileService.getUserInterests(userId);
  }
}
