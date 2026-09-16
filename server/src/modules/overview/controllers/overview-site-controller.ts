import { Controller, Get } from '@nestjs/common';
import { ZSerialize } from 'nest-zod';
import { RoleType } from 'src/infastructures/prisma/common/client';
import { CurrentUser } from 'src/shared/decorators/current-user-decorator';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import { Roles } from 'src/shared/decorators/roles-decorator';
import type { JwtPayload } from 'src/shared/types/jwt-payload';
import type {
  AdminOverviewDto,
  DepartmentOverviewDto,
} from '../dto/overview-site-dto';
import { OverviewSiteService } from '../services/overview-site-service';
import {
  AdminOverviewResponseSchema,
  DepartmentOverviewResponseSchema,
} from '../validators/overview-site-validator';

/**
 * The dashboard's numbers. The system-wide view belongs to the roles that run the
 * whole platform; a coordinator only ever sees their own college.
 */
@Controller('v1/overview')
export class OverviewSiteController {
  constructor(private readonly overviewSiteService: OverviewSiteService) {}

  @Get('admin')
  @Roles(RoleType.ADMIN, RoleType.DIRECTOR)
  @ResponseMessage('System overview')
  @ZSerialize(AdminOverviewResponseSchema)
  async getAdminOverview(): Promise<AdminOverviewDto> {
    return this.overviewSiteService.getAdminOverview();
  }

  @Get('department')
  @Roles(RoleType.COORDINATOR)
  @ResponseMessage('Department overview')
  @ZSerialize(DepartmentOverviewResponseSchema)
  async getDepartmentOverview(
    @CurrentUser() caller: JwtPayload,
  ): Promise<DepartmentOverviewDto> {
    return this.overviewSiteService.getDepartmentOverview(caller.sub);
  }
}
