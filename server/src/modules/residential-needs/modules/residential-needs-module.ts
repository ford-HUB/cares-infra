import { Module } from '@nestjs/common';
import { ResidentialNeedsMobileModule } from './residential-needs-mobile-module';
import { ResidentialNeedsSiteModule } from './residential-needs-site-module';

@Module({ imports: [ResidentialNeedsMobileModule, ResidentialNeedsSiteModule] })
export class ResidentialNeedsModule {}
