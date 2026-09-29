import { Module } from '@nestjs/common';
import { AccountSettingsAdminModule } from '../admin/modules/account-settings-admin-module';
import { AccountSettingsVolunteerModule } from '../volunteer/modules/account-settings-volunteer-module';

@Module({
  imports: [AccountSettingsAdminModule, AccountSettingsVolunteerModule],
})
export class AccountSettingsModule {}
