import { Module } from '@nestjs/common';
import { PassportModule } from 'src/infastructures/passport/passport-module';
import { LoginActivityModule } from 'src/modules/login-activity/modules/login-activity-module';
import { AuthDonorController } from '../controllers/auth-donor-controller';
import { AuthDonorService } from '../services/auth-donor-service';
import { AuthRepository } from '../repositories/auth-repository';
import { BeneficiaryApprovalGate } from '../services/beneficiary-approval-gate';

@Module({
  imports: [PassportModule, LoginActivityModule],
  controllers: [AuthDonorController],
  providers: [AuthDonorService, AuthRepository, BeneficiaryApprovalGate],
  exports: [AuthDonorService],
})
export class AuthDonorModule {}
