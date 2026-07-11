import { Module } from '@nestjs/common';
import { AccountSettingsSiteController } from '../controllers/account-settings-site-controller';
import { AccountSettingsRepository } from '../repositories/account-settings-repository';
import { AccountSettingsSiteService } from '../services/account-settings-site-service';

@Module({
    controllers: [AccountSettingsSiteController],
    providers: [AccountSettingsSiteService, AccountSettingsRepository],
    exports: [AccountSettingsSiteService],
})
export class AccountSettingsSiteModule {}
