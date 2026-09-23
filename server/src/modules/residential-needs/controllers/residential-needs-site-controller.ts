import { Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ZBody, ZSerialize } from 'nest-zod';
import { PORTAL_ROLE_TYPES } from 'src/shared/constants/portal-role-types';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import { Roles } from 'src/shared/decorators/roles-decorator';
import type {
  ClusterNeedsDto,
  ClusterNeedsResponseDto,
} from '../dto/residential-needs-site-dto';
import { ResidentialNeedsSiteService } from '../services/residential-needs-site-service';
import {
  ClusterNeedsResponseSchema,
  ClusterNeedsSchema,
} from '../validators/residential-needs-site-validator';

/** Residential Needs — the K-Means grouping behind the Clusters screen. */
@Controller('v1/residential-needs')
@Roles(...PORTAL_ROLE_TYPES)
export class ResidentialNeedsSiteController {
  constructor(
    private readonly residentialNeedsSiteService: ResidentialNeedsSiteService,
  ) {}

  /**
   * POST rather than GET because the rows travel in the body: the survey is not in
   * the database yet, so the portal sends what it is showing.
   */
  @Post('clusters')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Households clustered')
  @ZSerialize(ClusterNeedsResponseSchema)
  async clusterNeeds(
    @ZBody(ClusterNeedsSchema) data: ClusterNeedsDto,
  ): Promise<ClusterNeedsResponseDto> {
    return this.residentialNeedsSiteService.clusterNeeds(data);
  }
}
