import { Module } from '@nestjs/common';
import { AccountSettingsModule } from '../account/modules/account-settings-module';

@Module({
  imports: [AccountSettingsModule],
})
export class SettingsModule {}
