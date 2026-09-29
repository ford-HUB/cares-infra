import { Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ZSerialize } from 'nest-zod';
import { PermissionKey } from 'src/infastructures/prisma/common/client';
import { PORTAL_ROLE_TYPES } from 'src/shared/constants/portal-role-types';
import { RequirePermission } from 'src/shared/decorators/require-permission-decorator';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import { Roles } from 'src/shared/decorators/roles-decorator';
import type { SystemDiagnosticsDto } from '../dto/system-diagnostics-site-dto';
import { SystemDiagnosticsSiteService } from '../services/system-diagnostics-site-service';
import { SystemDiagnosticsSchema } from '../validators/system-diagnostics-site-validator';

/**
 * The health board for what the schedulers depend on. It shares the "Manage
 * services" right: the people who operate the schedulers are the ones who act on
 * a failing probe.
 */
@Controller('v1/system-diagnostics')
@Roles(...PORTAL_ROLE_TYPES)
@RequirePermission(PermissionKey.SYSTEM_SERVICE_MANAGE)
export class SystemDiagnosticsSiteController {
  constructor(
    private readonly systemDiagnosticsSiteService: SystemDiagnosticsSiteService,
  ) {}

  @Get()
  @ResponseMessage('System diagnostics')
  @ZSerialize(SystemDiagnosticsSchema)
  async getDiagnostics(): Promise<SystemDiagnosticsDto> {
    return this.systemDiagnosticsSiteService.getDiagnostics();
  }

  @Post('check')
  @HttpCode(200)
  @ResponseMessage('Diagnostics complete')
  @ZSerialize(SystemDiagnosticsSchema)
  async runDiagnostics(): Promise<SystemDiagnosticsDto> {
    return this.systemDiagnosticsSiteService.runDiagnostics();
  }
}
