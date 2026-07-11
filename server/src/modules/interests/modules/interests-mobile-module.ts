import { Module } from "@nestjs/common";
import { InterestsMobileController } from "../controllers/interests-mobile-controller";
import { InterestsRepository } from "../repositories/interests-repository";
import { InterestsMobileService } from "../services/interests-mobile-service";

@Module({
    controllers: [InterestsMobileController],
    providers: [InterestsMobileService, InterestsRepository],
    exports: [InterestsRepository, InterestsMobileService],
})
export class InterestsMobileModule {}
