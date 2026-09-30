import {
  Controller,
  Get,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ZBody, ZSerialize } from 'nest-zod';
import { CurrentUser } from 'src/shared/decorators/current-user-decorator';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import { Roles } from 'src/shared/decorators/roles-decorator';
import type { JwtPayload } from 'src/shared/types/jwt-payload';
import type {
  CreateAssistanceRequestDto,
  MobileAssistanceRequestDto,
  MobileAssistanceRequestListDto,
} from '../dto/assistance-requests-mobile-dto';
import { AssistanceRequestsMobileService } from '../services/assistance-requests-mobile-service';
import {
  ASSISTANCE_ATTACHMENT_MAX_COUNT,
  CreateAssistanceRequestSchema,
  MOBILE_ASSISTANCE_ROLE_TYPES,
  MobileAssistanceRequestListResponseSchema,
  MobileAssistanceRequestResponseSchema,
} from '../validators/assistance-requests-mobile-validator';

/** The beneficiary's own assistance requests — everything under `me`. */
@Controller('v1/assistance-requests')
@Roles(...MOBILE_ASSISTANCE_ROLE_TYPES)
export class AssistanceRequestsMobileController {
  constructor(
    private readonly assistanceRequestsMobileService: AssistanceRequestsMobileService,
  ) {}

  @Get('me')
  @ResponseMessage('Your assistance requests')
  @ZSerialize(MobileAssistanceRequestListResponseSchema)
  async listMine(
    @CurrentUser() user: JwtPayload,
  ): Promise<MobileAssistanceRequestListDto> {
    return this.assistanceRequestsMobileService.listMine(user.sub);
  }

  /**
   * Multipart: the request fields as text beside up to three optional
   * `attachments` (an ID, a bill, a medical certificate, a photo).
   */
  @Post('me')
  @ResponseMessage('Your request is pending review')
  @ZSerialize(MobileAssistanceRequestResponseSchema)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'attachments', maxCount: ASSISTANCE_ATTACHMENT_MAX_COUNT },
    ]),
  )
  async create(
    @ZBody(CreateAssistanceRequestSchema) body: CreateAssistanceRequestDto,
    @CurrentUser() user: JwtPayload,
    @UploadedFiles() files?: { attachments?: Express.Multer.File[] },
  ): Promise<MobileAssistanceRequestDto> {
    return this.assistanceRequestsMobileService.create(
      user.sub,
      body,
      files?.attachments ?? [],
    );
  }
}
