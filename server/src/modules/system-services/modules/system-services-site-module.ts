import { Module } from '@nestjs/common';
import { SchedulersModule } from '../../../schedulers/schedulers-module';
import { SystemServicesSiteController } from '../controllers/system-services-site-controller';
import { SystemServicesSiteService } from '../services/system-services-site-service';

@Module({
  // The queues and the run recorder come from the schedulers module — this one only
  // reads and steers them.
  imports: [SchedulersModule],
  controllers: [SystemServicesSiteController],
  providers: [SystemServicesSiteService],
})
export class SystemServicesSiteModule {}
