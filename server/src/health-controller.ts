import { Controller, Get } from '@nestjs/common';
import { ResponseMessage } from './common/decorators/response-message-decorator';
import { Public } from './common/decorators/public-decorator';

@Controller('health')
@Public()
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

