import { Controller, ForbiddenException, Get, Put } from '@nestjs/common';
import { ZBody, ZParam, ZSerialize } from 'nest-zod';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import { Public } from 'src/shared/decorators/public-decorator';
import { Roles } from 'src/shared/decorators/roles-decorator';
import { CurrentUser } from 'src/shared/decorators/current-user-decorator';
import {
  isPortalRole,
  PORTAL_ROLE_TYPES,
} from 'src/shared/constants/portal-role-types';
import { RoleType } from '../../../infastructures/prisma/common/client';
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

  @Put()
  @Roles(RoleType.VOLUNTEER)
  @ResponseMessage('Interests saved')
  @ZSerialize(SaveUserInterestsResponseSchema)
  async saveUserInterests(
    @CurrentUser() user: JwtPayload,
    @ZBody(SaveUserInterestsSchema) data: SaveUserInterestsDto,
  ): Promise<SaveUserInterestsResponseDto> {
    return this.interestsMobileService.saveUserInterests(
      user.sub,
      data.selected,
    );
  }

  @Get(':userId')
  @Roles(RoleType.VOLUNTEER, ...PORTAL_ROLE_TYPES)
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
