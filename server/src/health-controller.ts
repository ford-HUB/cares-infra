import { Controller, Get } from '@nestjs/common';
import { ResponseMessage } from './common/decorators/response-message-decorator';

@Controller('health')
export class HealthController {
  @Get()
  @ResponseMessage('Healthy')
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}

