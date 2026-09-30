import { Module } from '@nestjs/common';
import { ResidentialNeedsMobileModule } from './residential-needs-mobile-module';
import { ResidentialNeedsSiteModule } from './residential-needs-site-module';

/** Mobile answers the Needs Assessment Survey; the portal clusters households. */
@Module({ imports: [ResidentialNeedsMobileModule, ResidentialNeedsSiteModule] })
export class ResidentialNeedsModule {}
