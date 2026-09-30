import { Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ZBody, ZSerialize } from 'nest-zod';
import { PORTAL_ROLE_TYPES } from 'src/shared/constants/portal-role-types';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import { Roles } from 'src/shared/decorators/roles-decorator';
import type {
  ClusterNeedsDto,
  ClusterNeedsResponseDto,
  HouseholdListResponseDto,
} from '../dto/residential-needs-site-dto';
import { ResidentialNeedsSiteService } from '../services/residential-needs-site-service';
import {
  ClusterNeedsResponseSchema,
  ClusterNeedsSchema,
  HouseholdListResponseSchema,
} from '../validators/residential-needs-site-validator';

/**
 * Residential Needs — the submitted Needs Assessment Surveys and the K-Means
 * grouping behind the Clusters screen.
 */
@Controller('v1/residential-needs')
@Roles(...PORTAL_ROLE_TYPES)
export class ResidentialNeedsSiteController {
  constructor(
    private readonly residentialNeedsSiteService: ResidentialNeedsSiteService,
  ) {}

  /** Every submitted survey, newest first, with the respondent's household details. */
  @Get('households')
  @ResponseMessage('Surveyed households')
  @ZSerialize(HouseholdListResponseSchema)
  async listHouseholds(): Promise<HouseholdListResponseDto> {
    return this.residentialNeedsSiteService.listHouseholds();
  }

  /**
   * Clusters every submitted survey. POST because each call runs the model
   * afresh with the given group count and random start.
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
