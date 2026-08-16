import { Module } from '@nestjs/common';
import { AccountSettingsAdminController } from '../controllers/account-settings-admin-controller';
import { AccountSettingsRepository } from '../../repositories/account-settings-repository';
import { AccountSettingsAdminService } from '../services/account-settings-admin-service';

@Module({
  controllers: [AccountSettingsAdminController],
  providers: [AccountSettingsAdminService, AccountSettingsRepository],
  exports: [AccountSettingsAdminService],
})
export class AccountSettingsAdminModule {}
