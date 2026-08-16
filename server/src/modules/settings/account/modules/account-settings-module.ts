import { Module } from '@nestjs/common';
import { AccountSettingsAdminModule } from '../admin/modules/account-settings-admin-module';

@Module({
  imports: [AccountSettingsAdminModule],
})
export class AccountSettingsModule {}
