import { Module } from '@nestjs/common';
import { AccountSettingsSiteModule } from './account-settings-site-module';

@Module({
    imports: [AccountSettingsSiteModule],
})
export class AccountSettingsModule {}
