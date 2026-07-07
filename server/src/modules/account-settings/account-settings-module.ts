import { Module } from '@nestjs/common';
import { AccountSettingsController } from './account-settings-controller';
import { AccountSettingsRepository } from './account-settings-repository';
import { AccountSettingsService } from './account-settings-service';

@Module({
    controllers: [AccountSettingsController],
    providers: [AccountSettingsService, AccountSettingsRepository],
})
export class AccountSettingsModule {}
