import { Module } from '@nestjs/common';
import { NodemailerModule } from 'src/infastructures/nodemailer/nodemailer-module';
import { ProfileCacheModule } from '../../../../profile/modules/profile-cache-module';
import { AccountSettingsRepository } from '../../repositories/account-settings-repository';
import { AccountSettingsVolunteerController } from '../controllers/account-settings-volunteer-controller';
import { AccountSettingsVolunteerService } from '../services/account-settings-volunteer-service';

@Module({
  imports: [NodemailerModule, ProfileCacheModule],
  controllers: [AccountSettingsVolunteerController],
  providers: [AccountSettingsVolunteerService, AccountSettingsRepository],
  exports: [AccountSettingsVolunteerService],
})
export class AccountSettingsVolunteerModule {}
