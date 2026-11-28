import { Module } from '@nestjs/common';
import { SchedulersModule } from '../../../schedulers/schedulers-module';
import { SystemServicesSiteController } from '../controllers/system-services-site-controller';
import { SystemServicesSiteService } from '../services/system-services-site-service';

@Module({
  // Queues and run recorder come from the schedulers module.
  imports: [SchedulersModule],
  controllers: [SystemServicesSiteController],
  providers: [SystemServicesSiteService],
})
export class SystemServicesSiteModule {}
