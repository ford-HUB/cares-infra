import {
    BadRequestException,
    Body,
    Controller,
    Get,
    Put,
    StreamableFile,
    UploadedFiles,
    UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from 'src/common/decorators/current-user-decorator';
import { ResponseMessage } from 'src/common/decorators/response-message-decorator';
import { Roles } from 'src/common/decorators/roles-decorator';
import { PORTAL_ROLE_TYPES } from 'src/common/constants/portal-role-types';
import { ZodValidationPipe } from 'src/common/pipes/zod-validation-pipe';
import { JwtPayload } from 'src/common/types/jwt-payload';
import { ProfileSiteService } from '../services/profile-site-service';
import { UpdatePortalProfileInput, UpdatePortalProfileSchema } from '../validators/profile-site-validator';

@Controller('v1/profile')
export class ProfileSiteController {
    constructor(private readonly profileSiteService: ProfileSiteService) {}

    @Get('me')
    @Roles(...PORTAL_ROLE_TYPES)
    @ResponseMessage('Portal profile')
    async getMyProfile(@CurrentUser() user: JwtPayload) {
        return this.profileSiteService.getMyProfile(user.sub);
    }

    @Put('me')
    @Roles(...PORTAL_ROLE_TYPES)
    @ResponseMessage('Profile updated')
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'avatar', maxCount: 1 },
        { name: 'signature', maxCount: 1 },
    ]))
    async updateMyProfile(
        @CurrentUser() user: JwtPayload,
        @Body(new ZodValidationPipe(UpdatePortalProfileSchema)) data: UpdatePortalProfileInput,
        @UploadedFiles() files?: {
            avatar?: Express.Multer.File[];
            signature?: Express.Multer.File[];
        },
    ) {
        const avatar = files?.avatar?.[0];
        const signature = files?.signature?.[0];

        if (avatar && !avatar.buffer?.length) {
            throw new BadRequestException('Avatar file is empty');
        }
        if (signature && !signature.buffer?.length) {
            throw new BadRequestException('Signature file is empty');
        }

        return this.profileSiteService.updateMyProfile(user.sub, data, {
            avatar,
            signature,
        });
    }

    @Get('me/avatar')
    @Roles(...PORTAL_ROLE_TYPES)
    async getAvatar(@CurrentUser() user: JwtPayload) {
        const asset = await this.profileSiteService.getProfileAsset(user.sub, 'avatar');
        return new StreamableFile(asset.buffer, {
            type: asset.contentType,
            disposition: 'inline',
        });
    }

    @Get('me/signature')
    @Roles(...PORTAL_ROLE_TYPES)
    async getSignature(@CurrentUser() user: JwtPayload) {
        const asset = await this.profileSiteService.getProfileAsset(user.sub, 'signature');
        return new StreamableFile(asset.buffer, {
            type: asset.contentType,
            disposition: 'inline',
        });
    }
}
