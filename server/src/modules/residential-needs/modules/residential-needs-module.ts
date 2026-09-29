import { Module } from '@nestjs/common';
import { ResidentialNeedsSiteModule } from './residential-needs-site-module';

@Module({ imports: [ResidentialNeedsSiteModule] })
export class ResidentialNeedsModule {}
